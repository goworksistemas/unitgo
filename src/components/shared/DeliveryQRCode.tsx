import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '../ui/card';

interface DeliveryQRCodeProps {
  code: string;
  size?: number;
  showCode?: boolean;
}

export function DeliveryQRCode({ code, size = 200, showCode = true }: DeliveryQRCodeProps) {
  return (
    <Card className="inline-block bg-white dark:bg-card">
      <CardContent className="p-4 sm:p-6">
        <div 
          className="flex items-center justify-center bg-white dark:bg-card rounded-lg p-2"
          style={{ width: size + 16, height: size + 16 }}
        >
          <QRCodeSVG
            value={code}
            size={size}
            level="H"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#000000"
            imageSettings={{
              src: "",
              x: undefined,
              y: undefined,
              height: 0,
              width: 0,
              excavate: false,
            }}
          />
        </div>
        
        {showCode && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Código de Entrega</p>
            <p className="text-xl sm:text-2xl font-mono tracking-wider text-gray-900">
              {code}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}