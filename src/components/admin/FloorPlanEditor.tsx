'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Trash2, 
  Save, 
  RefreshCcw, 
  Square, 
  Circle as CircleIcon,
  Type,
  Maximize2,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Clock,
  User,
  AlertTriangle,
  X,
  MoreVertical
} from 'lucide-react';

import { useToast } from '@/components/ui/Toast';

interface FloorItem {
  id: string;
  type: 'TABLE' | 'BOOTH' | 'STAGE' | 'BAR' | 'LABEL';
  name: string;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status?: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'UNAVAILABLE';
  reservation?: any;
  groupId?: string;
  group?: any;
}

interface FloorPlanEditorProps {
  venueSlug: string;
  eventSlug?: string;
  mode: 'DEFAULT' | 'EVENT';
  assigningReservationId?: string;
  onAssignmentComplete?: () => void;
}

export function FloorPlanEditor({ venueSlug, eventSlug, mode, assigningReservationId, onAssignmentComplete }: FloorPlanEditorProps) {
  const [items, setItems] = useState<FloorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const snapToGrid = true; // poravnanje na grid uvijek uključeno
  const [reservation, setReservation] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const GRID_SIZE = 20;

  const isAssignMode = !!assigningReservationId;

  // Prevent drag in assign mode
  const canDrag = !isAssignMode;

  const handleZoom = (delta: number) => {
      setZoom(prev => Math.max(0.3, Math.min(2, prev + delta)));
  };

  const fitToScreen = (itemsList: FloorItem[] = items) => {
    if (!containerRef.current || itemsList.length === 0) return;
    const padding = 40;
    const containerWidth = containerRef.current.clientWidth - padding;
    const containerHeight = containerRef.current.clientHeight - padding;
    
    const minX = Math.min(...itemsList.map(i => i.x));
    const maxX = Math.max(...itemsList.map(i => i.x + i.width));
    const minY = Math.min(...itemsList.map(i => i.y));
    const maxY = Math.max(...itemsList.map(i => i.y + i.height));
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    
    setZoom(Math.min(scaleX, scaleY, 1));
  };

  useEffect(() => {
    fetchItems();
    if (assigningReservationId) {
        fetchReservation();
    }
  }, [venueSlug, eventSlug, assigningReservationId]);

  const fetchReservation = async () => {
      try {
          const res = await fetch('/api/reservations');
          if (res.ok) {
              const data = await res.json();
              const found = data.find((r: any) => r.id === assigningReservationId);
              setReservation(found);
          }
      } catch {}
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = mode === 'DEFAULT' 
        ? `/api/venues/${venueSlug}/floor-plan`
        : `/api/events/${eventSlug}/floor-plan`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        // Promjena stola: preselektuj stolove koji su VEĆ dodijeljeni ovoj rezervaciji
        if (isAssignMode && assigningReservationId) {
          const current = (data as FloorItem[])
            .filter(i => i.reservation && i.reservation.id === assigningReservationId)
            .map(i => i.id);
          if (current.length > 0) setSelectedIds(current);
        }
        // Auto-fit kad se raspored učita — stolovi odmah vidljivi (naročito na mobitelu)
        if (data.length > 0) {
          setTimeout(() => fitToScreen(data), 350);
        }
      }
    } catch {
      console.error('Failed to fetch floor plan');
    } finally {
      setLoading(false);
    }
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      if (mode === 'DEFAULT') {
        const res = await fetch(`/api/venues/${venueSlug}/floor-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
        if (res.ok) showToast('Default raspored sačuvan');
      } else {
        const res = await fetch(`/api/events/${eventSlug}/floor-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'savePositions', items })
        });
        if (res.ok) showToast('Raspored za događaj sačuvan');
      }
    } catch {
      alert('Greška pri čuvanju.');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (type: FloorItem['type']) => {
    const newItem: FloorItem = {
      id: 'new-' + Date.now(),
      type,
      name: type === 'TABLE' ? 'Sto ' + (items.filter(i => i.type === 'TABLE').length + 1) : 
            type === 'BOOTH' ? 'Separe ' + (items.filter(i => i.type === 'BOOTH').length + 1) : 
            type === 'STAGE' ? 'BINA' : type,
      capacity: type === 'TABLE' ? 4 : type === 'BOOTH' ? 8 : 0,
      x: 100,
      y: 100,
      width: type === 'BOOTH' ? 120 : 60,
      height: 60,
      rotation: 0,
      status: 'AVAILABLE'
    };
    setItems([...items, newItem]);
    setSelectedIds([newItem.id]);
  };

  const deleteSelected = () => {
    setItems(items.filter(i => !selectedIds.includes(i.id)));
    setSelectedIds([]);
    setPropertiesOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent, item: FloorItem) => {
    if (e.button !== 0 || isAssignMode) return;
    e.stopPropagation();
    setPropertiesOpen(false);
    
    // Selection logic only for EDIT mode here
    if (!e.shiftKey && !selectedIds.includes(item.id)) {
        setSelectedIds([item.id]);
    } else if (e.shiftKey) {
        setSelectedIds(prev => 
            prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
        );
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleItemClick = (e: React.MouseEvent, item: FloorItem) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isAssignMode) {
        // TOGGLE logic za dodjelu/promjenu stola.
        // Dozvoljeno: slobodni stolovi + stolovi koji su VEĆ dodijeljeni ovoj rezervaciji
        // (da vlasnik može odznačiti stari sto i izabrati novi).
        const isCurrentAssignment = item.reservation && item.reservation.id === assigningReservationId;
        if (item.status === 'AVAILABLE' || isCurrentAssignment || selectedIds.includes(item.id)) {
            setSelectedIds(prev => 
                prev.includes(item.id) 
                    ? prev.filter(id => id !== item.id) 
                    : [...prev, item.id]
            );
        }
    } else {
        // Edit mode click — samo selekcija (opcije se otvaraju preko tri tačke)
        if (!isDragging && !e.shiftKey) {
            setSelectedIds([item.id]);
            setPropertiesOpen(false);
        }
    }
  };

  // Tri tačke u ćošku → otvaranje opcija (svojstava) pored elementa
  const openProperties = (item: FloorItem) => {
    if (!selectedIds.includes(item.id)) {
        setSelectedIds([item.id]);
    }
    setPropertiesOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent, item: FloorItem) => {
    e.stopPropagation();
    if (isAssignMode) return; // Handled by onClick for toggle consistency

    if (!canDrag) return;
    const touch = e.touches[0];
    setPropertiesOpen(false);
    
    if (!selectedIds.includes(item.id)) {
        setSelectedIds([item.id]);
    }

    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || selectedIds.length === 0) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    updatePositions(dx, dy, e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || selectedIds.length === 0) return;
    const touch = e.touches[0];

    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;

    updatePositions(dx, dy, touch.clientX, touch.clientY);
  };

  const updatePositions = (dx: number, dy: number, clientX: number, clientY: number) => {
    // Glatko pomjeranje: delta se dijeli sa zoom-om (1:1 praćenje kursora),
    // a poravnanje na grid se radi tek na kraju pokreta.
    const zx = zoom || 1;
    const updatedItems = items.map(item => {
      if (selectedIds.includes(item.id)) {
        return { ...item, x: item.x + dx / zx, y: item.y + dy / zx };
      }
      return item;
    });

    setItems(updatedItems);
    setDragStart({ x: clientX, y: clientY });
  };

  // Poravnanje na grid na kraju pokreta (uredan raspored, bez "stepanja" tokom vučenja)
  const snapSelectedToGrid = () => {
    if (!snapToGrid || selectedIds.length === 0) return;
    setItems(prev => prev.map(i =>
      selectedIds.includes(i.id)
        ? { ...i, x: Math.round(i.x / GRID_SIZE) * GRID_SIZE, y: Math.round(i.y / GRID_SIZE) * GRID_SIZE }
        : i
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    snapSelectedToGrid();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    snapSelectedToGrid();
  };

  const updateItemProperty = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const mergeSelected = async () => {
    if (selectedIds.length < 2) return;
    
    try {
        const res = await fetch(`/api/events/${eventSlug}/floor-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'merge', itemIds: selectedIds })
        });
        if (res.ok) {
            fetchItems();
            setSelectedIds([]);
        } else {
            const err = await res.json();
            alert(err.error);
        }
    } catch {
        alert('Greška pri spajanju.');
    }
  };

  const splitSelected = async () => {
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const groupIds = Array.from(new Set(selectedItems.map(i => i.groupId).filter(Boolean)));
    
    if (groupIds.length === 0) return;

    try {
        for (const gId of groupIds) {
            await fetch(`/api/events/${eventSlug}/floor-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'split', groupId: gId })
            });
        }
        fetchItems();
    } catch {
        alert('Greška pri razdvajanju.');
    }
  };

  const assignReservation = async () => {
    if (!assigningReservationId || selectedIds.length === 0) return;
    
    try {
        const res = await fetch(`/api/events/${eventSlug}/floor-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'assignReservation', 
                reservationId: assigningReservationId,
                itemIds: selectedIds
            })
        });
        if (res.ok) {
            showToast('Rezervacija dodijeljena');
            if (onAssignmentComplete) onAssignmentComplete();
            fetchItems();
            setSelectedIds([]);
        }
    } catch {
        alert('Greška pri dodjeli.');
    }
  };

  const resetToDefault = async () => {
    if (!confirm('Resetovati raspored na default raspored lokala?')) return;
    
    try {
        const res = await fetch(`/api/events/${eventSlug}/floor-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'resetToDefault' })
        });
        if (res.ok) {
            showToast('Raspored resetovan na default');
            fetchItems();
            setSelectedIds([]);
        } else {
            const err = await res.json();
            alert(err.error || 'Greška pri resetovanju.');
        }
    } catch {
        alert('Greška pri resetovanju.');
    }
  };

  const selectedItems = items.filter(i => selectedIds.includes(i.id));
  const selectedCapacity = selectedItems.reduce((sum, i) => sum + (i.capacity || 0), 0);
  const guestCount = reservation?.numberOfPeople || 0;
  const isCapacitySufficient = guestCount > 0 && selectedCapacity >= guestCount;

  // --- Praćenje pozicije board-a (za popup pored elementa) ---
  const [boardScroll, setBoardScroll] = useState({ left: 0, top: 0 });
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setBoardRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selectedIds, zoom, items, isAssignMode, loading]);

  const selectedItem = selectedIds.length === 1 ? items.find(i => i.id === selectedIds[0]) || null : null;
  const popupAnchorItem = selectedItem || selectedItems[0] || null;

  // Pozicija malog prozora sa svojstvima — pored izabranog stola/separea
  const POPUP_W = 280;
  let popupPos: { left: number; top: number } | null = null;
  if (boardRect && popupAnchorItem && !isAssignMode && !isDragging) {
    const ix = boardRect.left - boardScroll.left + popupAnchorItem.x * zoom;
    const iy = boardRect.top - boardScroll.top + popupAnchorItem.y * zoom;
    const iw = popupAnchorItem.width * zoom;
    const ih = popupAnchorItem.height * zoom;
    let left = ix + iw + 12;
    if (left + POPUP_W > window.innerWidth - 8) left = Math.max(8, ix - POPUP_W - 12);
    const top = Math.max(8, Math.min(iy + ih / 2 - 170, window.innerHeight - 8 - 400));
    popupPos = { left, top };
  }

  return (
    <div className="relative flex flex-col h-full min-h-[70dvh]">
      {/* TOOLBAR — mobitel: SAČUVAJ preko cijele širine + grid 3 kolone; desktop: jedan red */}
      <div className="shrink-0 p-3 md:p-4 border-b border-white/5 bg-surface z-40">
        {!isAssignMode ? (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            {/* MOBIL: SAČUVAJ puna širina, prvi red — nemoguće promašiti */}
            <button 
              onClick={saveLayout}
              disabled={saving}
              className="md:hidden w-full justify-center py-3.5 bg-primary text-white text-[11px] font-black rounded-xl uppercase tracking-widest shadow-[0_0_18px_rgba(255,0,110,0.45)] hover:bg-primary-hover transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} SAČUVAJ
            </button>

            {/* Grid dugmadi na mobitelu (3 kolone), red na desktopu */}
            <div className="grid grid-cols-3 gap-2 md:flex md:flex-1 md:items-center md:gap-2">
              <button onClick={() => addItem('TABLE')} className="p-2.5 md:p-2.5 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-[10px] font-black uppercase tracking-widest border border-white/5">
                <Square size={14} className="md:w-[16px]" /> STO
              </button>
              <button onClick={() => addItem('BAR')} className="p-2.5 md:p-2.5 bg-white/5 hover:bg-blue-500/20 hover:text-blue-500 rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-[10px] font-black uppercase tracking-widest border border-white/5">
                <CircleIcon size={14} className="md:w-[16px]" /> ŠANK
              </button>
              {mode !== 'EVENT' && (
                <>
                  <button onClick={() => addItem('BOOTH')} className="p-2.5 md:p-2.5 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-[10px] font-black uppercase tracking-widest border border-white/5">
                    <Maximize2 size={14} className="md:w-[16px]" /> SEPARE
                  </button>
                  <button onClick={() => addItem('STAGE')} className="p-2.5 md:p-2.5 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-[10px] font-black uppercase tracking-widest border border-white/5">
                    <Type size={14} className="md:w-[16px]" /> BINA
                  </button>
                  <button onClick={() => addItem('LABEL')} className="p-2.5 md:p-2.5 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[10px] md:text-[10px] font-black uppercase tracking-widest border border-white/5">
                    <Type size={14} className="md:w-[16px]" /> OZNAKA
                  </button>
                  <button onClick={deleteSelected} disabled={selectedIds.length === 0} className="md:hidden p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-30">
                    <Trash2 size={14} /> OBRIŠI
                  </button>
                </>
              )}
              {mode === 'EVENT' && (
                <button onClick={deleteSelected} disabled={selectedIds.length === 0} className="md:hidden p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-30">
                  <Trash2 size={14} /> OBRIŠI
                </button>
              )}
            </div>

            {/* DESKTOP: OBRIŠI + SAČUVAJ desno */}
            <div className="hidden md:flex md:items-center md:gap-2 md:shrink-0">
              <button onClick={deleteSelected} disabled={selectedIds.length === 0} className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30">
                <Trash2 size={16} /> OBRIŠI
              </button>
              <button 
                onClick={saveLayout}
                disabled={saving}
                className="whitespace-nowrap px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-[0_0_18px_rgba(255,0,110,0.45)] hover:bg-primary-hover transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} SAČUVAJ
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <User size={12} className="text-primary" />
              <span className="text-[10px] md:text-[10px] font-black text-primary uppercase tracking-widest">{reservation?.name ? 'Dodjela: ' + reservation.name : 'Dodjela'}</span>
            </div>
          </div>
        )}
      </div>

      {/* BOARD AREA + OVERLAYS */}
      <div className="relative flex-1 min-h-[45dvh]">
        <div 
            ref={containerRef}
            className="absolute inset-0 overflow-auto cursor-crosshair select-none bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]"
            onScroll={(e) => setBoardScroll({ left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop })}

            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setSelectedIds([]);
                    setPropertiesOpen(false);
                }
            }}
        >
            <div 
                ref={boardRef}
                style={{ 
                    transform: `scale(${zoom})`,
                    transformOrigin: '0 0',
                    width: '1500px',
                    height: '1000px'
                }}
                className="relative"
            >
                {items.map(item => {
                    const isSelected = selectedIds.includes(item.id);
                    const isGrouped = !!item.groupId;
                    let bgColor = 'bg-surface/80';
                    let borderColor = isSelected ? 'border-primary shadow-[0_0_15px_rgba(255,0,110,0.3)]' : 'border-white/10';
                    
                    if (item.type === 'STAGE') bgColor = 'bg-purple-900/40';
                    if (item.type === 'BAR') bgColor = 'bg-blue-900/40';
                    
                    if (mode === 'EVENT') {
                        if (item.status === 'RESERVED') borderColor = 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]';
                        if (item.status === 'OCCUPIED') borderColor = 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
                        if (item.status === 'AVAILABLE') borderColor = isSelected ? 'border-primary shadow-[0_0_15px_rgba(255,0,110,0.4)]' : 'border-green-500/30';
                    }

                    return (
                        <div 
                            key={item.id}
                            onMouseDown={(e) => handleMouseDown(e, item)}
                            onTouchStart={(e) => handleTouchStart(e, item)}
                            style={{
                                left: item.x,
                                top: item.y,
                                width: item.width,
                                height: item.height,
                                transform: `rotate(${item.rotation}deg)`,
                                zIndex: isSelected ? 100 : (isGrouped ? 10 : 1),
                                touchAction: 'none'
                            }}
                            className={`absolute ${bgColor} border-2 ${borderColor} rounded-xl flex flex-col items-center justify-center p-2 cursor-move group/item ${isDragging && isSelected ? '' : 'transition-all duration-200'}`}
                            onClick={(e) => handleItemClick(e, item)}
                        >
                            {isGrouped && !isAssignMode && (
                                <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-lg border border-white/20 z-20">
                                   <LinkIcon size={10} />
                                </div>
                            )}
                            
                            {isSelected && isAssignMode && (
                               <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border border-white/20 z-20 animate-bounce">
                                  <CheckCircle2 size={12} />
                               </div>
                            )}

                            {/* Tri tačke — opcije (svojstva) se otvaraju samo odavde */}
                            {!isAssignMode && (
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); openProperties(item); }}
                                title="Opcije"
                                aria-label={`Opcije za ${item.name}`}
                                className={`absolute -top-2.5 -right-2.5 z-30 w-7 h-7 rounded-full bg-surface border border-white/15 flex items-center justify-center text-muted hover:text-white hover:bg-primary hover:border-primary shadow-lg transition-all ${isSelected || propertiesOpen ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
                              >
                                <MoreVertical size={13} />
                              </button>
                            )}

                            <span className="text-[10px] font-black text-white uppercase tracking-tighter text-center leading-none mb-1 max-w-full truncate px-1">{item.name}</span>
                            {item.capacity > 0 && (
                                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{item.capacity} MJ</span>
                            )}
                            
                            {/* Ime gosta na dodijeljenom stolu (EVENT mod) — visoki kontrast */}
                            {mode === 'EVENT' && item.reservation && (
                                <span className="w-full max-w-full mt-1 flex items-center justify-center gap-1 rounded-md bg-black/80 border border-yellow-400/70 text-yellow-300 px-1.5 py-1 text-[10px] md:text-[10px] font-black uppercase tracking-wide leading-none shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                                   <User size={10} className="shrink-0" />
                                   <span className="truncate">{item.reservation.name}</span>
                                </span>
                            )}
                            
                            {/* Status dots for EVENT mode */}
                            {mode === 'EVENT' && (
                                <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${
                                    item.status === 'AVAILABLE' ? 'bg-green-500 animate-pulse' :
                                    item.status === 'RESERVED' ? 'bg-yellow-500' :
                                    item.status === 'OCCUPIED' ? 'bg-red-500' : 'bg-muted'
                                }`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* ZOOM OVERLAY — na samom boardu, ne prekriva ništa */}
        {!isAssignMode && (
          <div className="absolute bottom-4 right-4 z-30 flex flex-col items-center gap-1 p-1 rounded-xl bg-surface/90 backdrop-blur border border-white/10 shadow-xl">
            <button onClick={() => handleZoom(0.1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-xs font-black transition-all" title="Uvećaj">+</button>
            <button onClick={() => fitToScreen()} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-all" title="Uklopi sve">FIT</button>
            <button onClick={() => handleZoom(-0.1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-xs font-black transition-all" title="Umanji">−</button>
            {mode === 'EVENT' && (
              <button onClick={resetToDefault} className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 hover:text-primary rounded-lg text-muted transition-all border-t border-white/5" title="Resetuj na default raspored">
                <RefreshCcw size={12} />
              </button>
            )}
          </div>
        )}

        {/* HINT — dodjela, ništa izabrano */}
        {isAssignMode && selectedIds.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-surface/90 backdrop-blur border border-white/10 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap shadow-xl">
            Tapni slobodan sto ili separe · {guestCount} mjesta
          </div>
        )}

        {/* ASSIGN BAR — rezime dodjele */}
        {isAssignMode && selectedIds.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest truncate">{reservation?.name || 'Rezervacija'} · {guestCount} mjesta</span>
              <span className={`text-[10px] font-black uppercase whitespace-nowrap ${isCapacitySufficient ? 'text-green-500' : 'text-primary'}`}>{selectedCapacity} / {guestCount} MJ</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${isCapacitySufficient ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, guestCount > 0 ? (selectedCapacity / guestCount) * 100 : 0)}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedItems.map(i => (
                <div key={i.id} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-black text-white uppercase">{i.name}</div>
              ))}
            </div>
            {!isCapacitySufficient && (
              <p className="text-[10px] font-bold text-yellow-500 leading-relaxed uppercase flex items-center gap-2">
                <AlertTriangle size={12} className="shrink-0" /> Kapacitet nije dovoljan — izaberi još
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={assignReservation} disabled={!isCapacitySufficient || selectedIds.length === 0} className="flex-1 py-3.5 bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all disabled:opacity-30 disabled:grayscale">
                Potvrdi
              </button>
              <button onClick={onAssignmentComplete} className="flex-1 py-3.5 bg-white/5 text-muted hover:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-white/5 transition-all">
                Otkaži
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP — svojstva pored stola/separea */}
      {popupPos && popupAnchorItem && propertiesOpen && createPortal(
        <div
          style={{ left: popupPos.left, top: popupPos.top }}
          className="fixed z-[400] w-[280px] max-w-[calc(100vw-16px)] rounded-2xl bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
        >
          {selectedItem ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-white/5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  {selectedItem.type === 'TABLE' ? <Square size={13} /> : selectedItem.type === 'BOOTH' ? <Maximize2 size={13} /> : selectedItem.type === 'BAR' ? <CircleIcon size={13} /> : <Type size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-white uppercase truncate">{selectedItem.name}</p>
                  <p className="text-[7px] font-bold text-muted uppercase tracking-[0.2em]">
                    {selectedItem.type === 'TABLE' ? 'Sto' : selectedItem.type === 'BOOTH' ? 'Separe' : selectedItem.type === 'STAGE' ? 'Bina' : selectedItem.type === 'BAR' ? 'Šank' : 'Oznaka'}
                  </p>
                </div>
                <button onClick={() => setPropertiesOpen(false)} aria-label="Zatvori opcije" className="p-1.5 text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0">
                  <X size={14} />
                </button>
              </div>

              <div className="p-3 space-y-2.5 max-h-[min(50dvh,420px)] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest">Naziv / Broj</label>
                  <input type="text" value={selectedItem.name} onChange={e => updateItemProperty(selectedItem.id, 'name', e.target.value)} className="w-full bg-background/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Kapacitet</label>
                    <input type="number" value={selectedItem.capacity || ''} onChange={e => updateItemProperty(selectedItem.id, 'capacity', parseInt(e.target.value) || 0)} className="w-full bg-background/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Rotacija</label>
                    <input type="number" value={selectedItem.rotation || ''} onChange={e => updateItemProperty(selectedItem.id, 'rotation', parseInt(e.target.value) || 0)} className="w-full bg-background/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Širina</label>
                    <input type="number" value={selectedItem.width || ''} onChange={e => updateItemProperty(selectedItem.id, 'width', parseInt(e.target.value) || 0)} className="w-full bg-background/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Visina</label>
                    <input type="number" value={selectedItem.height || ''} onChange={e => updateItemProperty(selectedItem.id, 'height', parseInt(e.target.value) || 0)} className="w-full bg-background/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                {mode === 'EVENT' && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Status</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'AVAILABLE', label: 'Slobodan', color: 'bg-green-500' },
                        { id: 'RESERVED', label: 'Rezervisan', color: 'bg-yellow-500' },
                        { id: 'OCCUPIED', label: 'Zauzet', color: 'bg-red-500' },
                        { id: 'UNAVAILABLE', label: 'Nedostupan', color: 'bg-gray-500' }
                      ].map(st => (
                        <button key={st.id} onClick={() => updateItemProperty(selectedItem.id, 'status', st.id)} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-widest ${selectedItem.status === st.id ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-muted hover:bg-white/10'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${st.color}`} />
                          {st.label}
                        </button>
                      ))}
                    </div>
                    {selectedItem.status === 'RESERVED' && (
                      <button onClick={() => updateItemProperty(selectedItem.id, 'status', 'OCCUPIED')} className="w-full py-2 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Gost stigao</button>
                    )}
                    {selectedItem.status === 'OCCUPIED' && (
                      <button onClick={() => updateItemProperty(selectedItem.id, 'status', 'AVAILABLE')} className="w-full py-2 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5">Oslobodi sto</button>
                    )}
                    {selectedItem.reservation && (
                      <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-1">
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1.5"><Clock size={10} /> Rezervacija</p>
                        <p className="text-[10px] font-bold text-white uppercase">{selectedItem.reservation.name}</p>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{selectedItem.reservation.numberOfPeople} osoba • {new Date(selectedItem.reservation.startTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedItem.groupId && (
                  <button onClick={splitSelected} className="w-full py-2 bg-pink-500/10 border border-pink-500/20 text-pink-500 hover:bg-pink-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all">
                    <Unlink size={11} /> Razdvoji iz grupe
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-white/5">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  <LinkIcon size={13} />
                </div>
                <p className="flex-1 text-[10px] font-black text-white uppercase">Izabrano {selectedIds.length} elemenata</p>
                <button onClick={() => setPropertiesOpen(false)} aria-label="Zatvori opcije" className="p-1.5 text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0">
                  <X size={14} />
                </button>
              </div>
              <div className="p-3 space-y-2">
                {mode === 'EVENT' && (
                  <button onClick={mergeSelected} disabled={selectedIds.length < 2} className="w-full py-2.5 bg-accent text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all disabled:opacity-30 flex items-center justify-center gap-1.5">
                    <LinkIcon size={12} /> Spoji u grupu
                  </button>
                )}
                <button onClick={deleteSelected} className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all">
                  <Trash2 size={12} /> Obriši
                </button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
  return <RefreshCcw className={className} size={size} />;
}
