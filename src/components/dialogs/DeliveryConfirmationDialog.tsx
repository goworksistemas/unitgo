import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Camera, MapPin, CheckCircle, Package, Armchair, AlertCircle, KeyRound } from 'lucide-react';
import { DeliveryQRCode } from '../shared/DeliveryQRCode';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { unformatDailyCode } from '../../utils/dailyCode';
import type { DeliveryBatch, Request, FurnitureRequestToDesigner } from '../../types';

interface DeliveryConfirmationDialogProps {
  batch: DeliveryBatch;
  open: boolean;
  onClose: () => void;
}

export function DeliveryConfirmationDialog({ batch, open, onClose }: DeliveryConfirmationDialogProps) {
  const { 
    currentUser, 
    items, 
    units, 
    requests, 
    furnitureRequestsToDesigner,
    confirmDelivery,
    getUserDailyCode,
    getItemById,
    getUnitById 
  } = useApp();
  
  const [photo, setPhoto] = useState<string>('');
  const [receiverCode, setReceiverCode] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const targetUnit = getUnitById(batch.targetUnitId);
  
  // Buscar solicitações do lote
  const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
  const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
    batch.furnitureRequestIds?.includes(r.id)
  );

  const totalItems = batchRequests.length + batchFurnitureRequests.length;

  // Capturar geolocalização
  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success('Localização capturada com sucesso');
        },
        (error) => {
          toast.error('Não foi possível capturar a localização');
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  // Iniciar captura de foto
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      toast.error('Não foi possível acessar a câmera');
      console.error('Camera error:', error);
      setIsCapturing(false);
    }
  };

  // Capturar foto
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        
        // Parar câmera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
        
        toast.success('Foto capturada!');
      }
    }
  };

  // Confirmar entrega
  const handleConfirm = async () => {
    if (!photo) {
      toast.error('Tire uma foto da entrega');
      return;
    }

    if (!receiverCode) {
      toast.error('Digite o código diário do recebedor');
      return;
    }

    try {
      await confirmDelivery(batch.id, {
        type: 'delivery',
        confirmedByUserId: currentUser!.id,
        photoUrl: photo,
        location: location || undefined,
        notes: notes || undefined
      }, receiverCode);

      toast.success('Entrega confirmada com sucesso! ✅');
      onClose();
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      toast.error('Erro ao confirmar entrega. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confirmar Entrega
          </DialogTitle>
          <DialogDescription>
            Fotografe a entrega e confirme o recebimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Entrega */}
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Destino:</span>
                  <Badge variant="outline">{targetUnit?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total de itens:</span>
                  <Badge>{totalItems}</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* QR Code */}
          <div className="flex justify-center py-2">
            <DeliveryQRCode code={batch.qrCode} size={180} />
          </div>

          {/* Lista de Itens */}
          <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
            <p className="text-sm mb-2">Itens neste lote:</p>
            
            {/* Materiais */}
            {batchRequests.map((request) => {
              const item = getItemById(request.itemId);
              return (
                <div key={request.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span>{item?.name}</span>
                  </div>
                  <Badge variant="secondary">{request.quantity}x</Badge>
                </div>
              );
            })}

            {/* Móveis */}
            {batchFurnitureRequests.map((request) => {
              const item = getItemById(request.itemId);
              return (
                <div key={request.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-gray-500" />
                    <span>{item?.name}</span>
                  </div>
                  <Badge variant="secondary">{request.quantity}x</Badge>
                </div>
              );
            })}
          </div>

          {/* Captura de Foto */}
          <div className="space-y-3">
            <label className="text-sm">Foto da Entrega *</label>
            
            {!photo && !isCapturing && (
              <Button 
                onClick={startCamera}
                variant="outline" 
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto da Entrega
              </Button>
            )}

            {isCapturing && (
              <div className="space-y-2">
                <video 
                  ref={videoRef} 
                  className="w-full rounded-lg border"
                  autoPlay 
                  playsInline 
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Capturar
                  </Button>
                  <Button 
                    onClick={() => {
                      const stream = videoRef.current?.srcObject as MediaStream;
                      stream?.getTracks().forEach(track => track.stop());
                      setIsCapturing(false);
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {photo && (
              <div className="space-y-2">
                <img 
                  src={photo} 
                  alt="Foto da entrega" 
                  className="w-full rounded-lg border"
                />
                <Button 
                  onClick={() => {
                    setPhoto('');
                    startCamera();
                  }}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  Tirar Outra Foto
                </Button>
              </div>
            )}
          </div>

          {/* Localização */}
          <Button 
            onClick={captureLocation}
            variant="outline"
            className="w-full"
            disabled={!!location}
          >
            <MapPin className={`h-4 w-4 mr-2 ${location ? 'text-green-600' : ''}`} />
            {location ? 'Localização Capturada ✓' : 'Capturar Localização (Opcional)'}
          </Button>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-sm">Observações (Opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a entrega..."
              rows={3}
            />
          </div>

          {/* Alerta de Confirmação */}
          {photo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ao confirmar, você atesta que entregou todos os itens listados no destino correto.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!photo}
            className="bg-primary hover:bg-primary/90"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}