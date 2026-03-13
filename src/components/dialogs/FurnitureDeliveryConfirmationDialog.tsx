import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Camera, MapPin, CheckCircle, Armchair, AlertCircle, KeyRound, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { unformatDailyCode } from '../../utils/dailyCode';
import type { FurnitureRequestToDesigner } from '../../types';

interface FurnitureDeliveryConfirmationDialogProps {
  request: FurnitureRequestToDesigner;
  open: boolean;
  onClose: () => void;
}

export function FurnitureDeliveryConfirmationDialog({ request, open, onClose }: FurnitureDeliveryConfirmationDialogProps) {
  const { 
    currentUser, 
    getUserByDailyCode,
    getItemById,
    getUnitById,
    confirmFurnitureDelivery
  } = useApp();
  
  const [photo, setPhoto] = useState<string>('');
  const [receiverCode, setReceiverCode] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const item = getItemById(request.itemId);
  const targetUnit = getUnitById(request.requestingUnitId);
  
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

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Câmera não disponível. Verifique se o site está sendo acessado via HTTPS.', {
        duration: 5000,
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } } 
      });
      
      setIsCapturing(true);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoPlay deve resolver
        }
      } else {
        stream.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
      }
    } catch (error: any) {
      setIsCapturing(false);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Permissão da câmera negada. Habilite o acesso à câmera nas configurações do navegador.', {
          duration: 5000,
        });
      } else if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
        toast.error('Câmera não encontrada ou em uso por outro app.', { duration: 5000 });
      } else if (error.name === 'OverconstrainedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setIsCapturing(true);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            try { await videoRef.current.play(); } catch {}
          } else {
            fallbackStream.getTracks().forEach(track => track.stop());
            setIsCapturing(false);
          }
          return;
        } catch {
          toast.error('Não foi possível acessar a câmera.', { duration: 5000 });
        }
      } else {
        toast.error('Não foi possível acessar a câmera. Verifique as permissões.', { duration: 5000 });
      }
      
      console.error('Camera error:', error);
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

    if (!currentUser) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      // Validar código diário
      const formattedCode = unformatDailyCode(receiverCode);
      const receiver = getUserByDailyCode(formattedCode);
      
      if (!receiver) {
        toast.error('Código inválido. Verifique o código diário do recebedor.');
        return;
      }

      // Criar confirmação de entrega usando a tabela delivery_confirmations
      await confirmFurnitureDelivery(
        request.id,
        {
          type: 'delivery',
          confirmedByUserId: currentUser.id,
          photoUrl: photo,
          location: location || undefined,
          notes: notes || undefined,
        },
        formattedCode
      );

      toast.success('✅ Entrega confirmada com sucesso!', {
        description: `Recebido por: ${receiver.name}`
      });
      
      onClose();
      
      // Reset do estado
      setPhoto('');
      setReceiverCode('');
      setNotes('');
      setLocation(null);
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      toast.error('Erro ao confirmar entrega. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // Parar câmera se estiver ativa
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream?.getTracks().forEach(track => track.stop());
        }
        setIsCapturing(false);
      }
      onClose();
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirmar Entrega de Móvel
          </DialogTitle>
          <DialogDescription>
            Fotografe a entrega e confirme o recebimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Entrega */}
          <Alert>
            <Armchair className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Móvel:</span>
                  <Badge variant="outline">{item?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Destino:</span>
                  <Badge variant="outline">{targetUnit?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Local:</span>
                  <Badge>{request.location}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quantidade:</span>
                  <Badge>{request.quantity}x</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Código do Recebedor */}
          <div className="space-y-2">
            <Label htmlFor="receiver-code" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Código Diário do Recebedor *
            </Label>
            <Input
              id="receiver-code"
              type="text"
              placeholder="Digite o código (ex: 1234)"
              value={receiverCode}
              onChange={(e) => setReceiverCode(e.target.value)}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              O recebedor deve fornecer seu código diário de 4 dígitos
            </p>
          </div>

          {/* Captura de Foto */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Foto da Entrega *
            </Label>
            
            {!photo && !isCapturing && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={startCamera}
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
            )}

            {isCapturing && (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg border-2 border-primary"
                  autoPlay
                  playsInline
                  muted
                />
                <Button
                  type="button"
                  className="w-full"
                  onClick={capturePhoto}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
              </div>
            )}

            {photo && (
              <div className="space-y-2">
                <img 
                  src={photo} 
                  alt="Foto da entrega" 
                  className="w-full rounded-lg border-2 border-green-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setPhoto('');
                    startCamera();
                  }}
                >
                  Tirar Outra Foto
                </Button>
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Geolocalização */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={captureLocation}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {location ? 'Localização Capturada ✓' : 'Capturar Localização (opcional)'}
            </Button>
            {location && (
              <p className="text-xs text-muted-foreground text-center">
                Lat: {location.latitude.toFixed(6)}, Long: {location.longitude.toFixed(6)}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a entrega..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Parar câmera se estiver ativa
              if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream?.getTracks().forEach(track => track.stop());
              }
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={!photo || !receiverCode}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}