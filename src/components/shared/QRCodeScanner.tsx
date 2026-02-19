import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRCodeScanner({ onScanSuccess, onClose }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = useRef(`qr-reader-${Date.now()}`).current;
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (showScanner && !isScanning) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          initializeScanner();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showScanner, isScanning]);

  const handleStartScanner = () => {
    setShowScanner(true);
  };

  const initializeScanner = async () => {
    try {
      setError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Câmera não disponível. Verifique se o site está sendo acessado via HTTPS.');
        toast.error('Câmera não disponível', {
          description: 'O acesso à câmera requer conexão segura (HTTPS)'
        });
        setShowScanner(false);
        return;
      }

      // Solicitar permissão da câmera antes de iniciar o scanner
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } } 
        });
        testStream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        if (!isMountedRef.current) return;

        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          setError('Permissão da câmera negada. Habilite o acesso à câmera nas configurações do navegador.');
          toast.error('Permissão de câmera necessária', {
            description: 'Habilite o acesso à câmera para escanear QR Codes'
          });
        } else if (permErr.name === 'NotFoundError' || permErr.name === 'NotReadableError') {
          setError('Câmera não encontrada ou em uso por outro aplicativo.');
          toast.error('Câmera não disponível');
        } else {
          setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
          toast.error('Erro ao acessar câmera');
        }

        setShowScanner(false);
        return;
      }

      const element = document.getElementById(elementId);
      if (!element) {
        console.error('Element not found:', elementId);
        setError('Erro ao inicializar câmera. Por favor, tente novamente.');
        setShowScanner(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      if (!isMountedRef.current) return;
      setIsScanning(true);

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!isMountedRef.current) return;
          toast.success('QR Code lido com sucesso!');
          stopScanner();
          onScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && !err.message?.includes('Permission')) {
        console.error('Error starting scanner:', err);
      }
      
      if (!isMountedRef.current) return;

      if (err.name === 'NotAllowedError' || err.message?.includes('Permission') || err.message?.includes('permission')) {
        setError('Permissão da câmera negada. Habilite o acesso à câmera nas configurações do navegador.');
        toast.error('Permissão de câmera necessária', {
          description: 'Habilite o acesso à câmera para escanear QR Codes'
        });
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada no dispositivo.');
        toast.error('Câmera não encontrada');
      } else {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
        toast.error('Erro ao acessar câmera');
      }
      
      setIsScanning(false);
      setShowScanner(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose?.();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Escanear QR Code</CardTitle>
            <CardDescription>
              Aponte a câmera para o QR Code da entrega
            </CardDescription>
          </div>
          {(
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!showScanner ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <Camera className="h-12 w-12 text-primary" />
              </div>
            </div>
            <Button
              onClick={handleStartScanner}
              className="w-full"
              size="lg"
            >
              <Camera className="mr-2 h-4 w-4" />
              Iniciar Scanner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              id={elementId} 
              className="rounded-lg overflow-hidden border-2 border-primary min-h-72"
            />
            {isScanning && (
              <Button
                onClick={stopScanner}
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            )}
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            O QR Code está no recibo de entrega do motorista
          </p>
        </div>
      </CardContent>
    </Card>
  );
}