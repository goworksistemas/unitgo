import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Camera, CheckCircle, Package, Armchair, AlertCircle, QrCode as QrCodeIcon, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { unformatDailyCode, formatDailyCode } from '../../utils/dailyCode';
import type { DeliveryBatch } from '../../types';

interface ReceiptConfirmationDialogProps {
  batch: DeliveryBatch;
  open: boolean;
  onClose: () => void;
}

export function ReceiptConfirmationDialog({ batch, open, onClose }: ReceiptConfirmationDialogProps) {
  const { 
    currentUser, 
    requests, 
    furnitureRequestsToDesigner,
    confirmReceipt,
    getUserDailyCode,
    getItemById,
    getUnitById,
    getUserById
  } = useApp();
  
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [dailyCodeInput, setDailyCodeInput] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [qrVerified, setQrVerified] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Força re-render quando a data muda (após meia-noite)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
      }
    }, 180 * 60 * 1000); // Verifica a cada 3 horas

    return () => clearInterval(interval);
  }, [currentDate]);
  
  const targetUnit = getUnitById(batch.targetUnitId);
  const driver = getUserById(batch.driverUserId);
  
  // Código diário do usuário atual
  const myDailyCode = currentUser ? getUserDailyCode(currentUser.id) : '';
  const formattedMyCode = formatDailyCode(myDailyCode);
  
  // Buscar solicitações do lote
  const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
  const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
    batch.furnitureRequestIds?.includes(r.id)
  );

  const totalItems = batchRequests.length + batchFurnitureRequests.length;

  // Verificar código QR
  const verifyQRCode = () => {
    if (qrCodeInput.trim().toUpperCase() === batch.qrCode.toUpperCase()) {
      setQrVerified(true);
      toast.success('Código verificado com sucesso! ✓');
    } else {
      toast.error('Código incorreto. Verifique e tente novamente.');
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
        video: { facingMode: { ideal: 'user' } }
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

  // Confirmar recebimento
  const handleConfirm = () => {
    if (!qrVerified) {
      toast.error('Verifique o código QR primeiro');
      return;
    }

    if (!photo) {
      toast.error('Tire uma foto confirmando o recebimento');
      return;
    }

    confirmReceipt(batch.id, {
      type: 'receipt',
      confirmedByUserId: currentUser!.id,
      photoUrl: photo,
      notes: notes || undefined
    });

    toast.success('Recebimento confirmado com sucesso! ✅');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-secondary" />
            Confirmar Recebimento
          </DialogTitle>
          <DialogDescription>
            Verifique o código e confirme o recebimento com uma foto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Entrega */}
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Entregador:</span>
                  <Badge variant="outline">{driver?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total de itens:</span>
                  <Badge>{totalItems}</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Verificação do Código QR */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted">
            <div className="flex items-center gap-2 mb-2">
              <QrCodeIcon className="h-5 w-5 text-primary" />
              <label className="text-sm">Código de Verificação</label>
            </div>
            
            {!qrVerified ? (
              <div className="space-y-2">
                <Input
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value.toUpperCase())}
                  placeholder="Digite o código do QR"
                  className="font-mono text-lg text-center tracking-wider"
                  maxLength={10}
                />
                <Button 
                  onClick={verifyQRCode}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={qrCodeInput.length < 6}
                >
                  Verificar Código
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Peça ao motorista para mostrar o código QR
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">Código Verificado ✓</span>
              </div>
            )}
          </div>

          {/* Lista de Itens - Só aparece após verificação */}
          {qrVerified && (
            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-sm mb-2">Itens recebidos:</p>
              
              {/* Materiais */}
              {batchRequests.map((request) => {
                const item = getItemById(request.itemId);
                return (
                  <div key={request.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
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
                      <Armchair className="h-4 w-4 text-muted-foreground" />
                      <span>{item?.name}</span>
                    </div>
                    <Badge variant="secondary">{request.quantity}x</Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Captura de Foto - Só aparece após verificação */}
          {qrVerified && (
            <div className="space-y-3">
              <label className="text-sm">Foto do Recebimento *</label>
              
              {!photo && !isCapturing && (
                <Button 
                  onClick={startCamera}
                  variant="outline" 
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Foto (Selfie)
                </Button>
              )}

              {isCapturing && (
                <div className="space-y-2">
                  <video 
                    ref={videoRef} 
                    className="w-full rounded-lg border"
                    autoPlay 
                    playsInline
                    muted
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
                    alt="Foto do recebimento" 
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
          )}

          {/* Observações */}
          {qrVerified && (
            <div className="space-y-2">
              <label className="text-sm">Observações (Opcional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Todos os itens recebidos em perfeito estado"
                rows={3}
              />
            </div>
          )}

          {/* Alerta de Confirmação */}
          {qrVerified && photo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ao confirmar, você atesta que recebeu todos os itens listados em boas condições.
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
            disabled={!qrVerified || !photo}
            className="bg-secondary hover:bg-secondary/90"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}