import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { QrCode, Camera, CheckCircle, Armchair, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import type { FurnitureRequestToDesigner } from '../../types';
import jsQR from 'jsqr';

interface FurnitureQRCodeScannerDialogProps {
  request: FurnitureRequestToDesigner;
  open: boolean;
  onClose: () => void;
}

export function FurnitureQRCodeScannerDialog({ request, open, onClose }: FurnitureQRCodeScannerDialogProps) {
  const { 
    currentUser,
    getUserByDailyCode,
    getItemById,
    getUnitById,
    confirmFurnitureDelivery
  } = useApp();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const item = getItemById(request.itemId);
  const targetUnit = getUnitById(request.requestingUnitId);

  // Iniciar câmera e scanner
  const startScanner = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Iniciar loop de escaneamento
        scanIntervalRef.current = window.setInterval(() => {
          scanQRCode();
        }, 300); // Escanear a cada 300ms
      }
    } catch (error) {
      toast.error('Não foi possível acessar a câmera');
      console.error('Camera error:', error);
      setIsScanning(false);
    }
  };

  // Escanear QR Code do vídeo
  const scanQRCode = () => {
    if (videoRef.current && canvasRef.current && scannedCode === null) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          // QR Code detectado
          const dailyCode = code.data;
          console.log('QR Code escaneado:', dailyCode);
          
          // Validar código diário
          const user = getUserByDailyCode(dailyCode);
          
          if (user) {
            setScannedCode(dailyCode);
            setReceiver(user);
            stopScanner();
            toast.success(`QR Code lido! Recebedor: ${user.name}`);
          } else {
            toast.error('Código QR inválido ou expirado');
          }
        }
      }
    }
  };

  // Parar scanner
  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
  };

  // Confirmar entrega
  const handleConfirm = async () => {
    if (!scannedCode || !receiver || !currentUser) {
      toast.error('Dados incompletos');
      return;
    }

    setIsConfirming(true);

    try {
      // Criar confirmação de entrega usando a tabela delivery_confirmations
      await confirmFurnitureDelivery(
        request.id,
        {
          type: 'delivery',
          confirmedByUserId: currentUser.id,
          photoUrl: '', // Não tem foto neste fluxo
          notes: `Confirmação via QR Code do recebedor ${receiver.name}`,
        },
        scannedCode
      );

      toast.success('✅ Entrega confirmada via QR Code!', {
        description: `Recebido por: ${receiver.name}`
      });

      onClose();
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      toast.error('Erro ao confirmar entrega. Tente novamente.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Cleanup ao fechar
  useEffect(() => {
    if (!open) {
      stopScanner();
      setScannedCode(null);
      setReceiver(null);
    }
  }, [open]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        stopScanner();
      }
      onClose();
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Confirmar Entrega via QR Code
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code do recebedor para confirmar a entrega
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

          {/* Scanner ou Resultado */}
          {!scannedCode ? (
            <div className="space-y-3">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Peça ao recebedor para abrir o QR Code na tela dele e aproxime a câmera
                </AlertDescription>
              </Alert>

              {!isScanning ? (
                <Button
                  className="w-full"
                  onClick={startScanner}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Iniciar Escaneamento
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border-2 border-primary">
                    <video
                      ref={videoRef}
                      className="w-full"
                      playsInline
                    />
                    <div className="absolute inset-0 border-4 border-transparent"
                         style={{
                           borderImage: 'linear-gradient(45deg, var(--primary), var(--secondary)) 1',
                         }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procurando QR Code...</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={stopScanner}
                  >
                    Cancelar Escaneamento
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p>QR Code escaneado com sucesso!</p>
                  <div className="flex items-center justify-between">
                    <span>Recebedor:</span>
                    <Badge className="bg-green-600">{receiver?.name}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Código:</span>
                    <Badge variant="outline">{scannedCode}</Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          {scannedCode && (
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Entrega
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
