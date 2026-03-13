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
    <Card className="w-fit mx-auto !bg-white border border-border">
      <CardContent className="p-4 sm:p-6">
        <div
          className="flex items-center justify-center rounded-lg p-2"
          style={{ width: size + 16, height: size + 16, backgroundColor: '#FFFFFF' }}
        >
          <QRCodeSVG
            value={code}
            size={size}
            level="H"
            marginSize={0}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>

        {showCode && (
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Código de Entrega</p>
            <p className="text-xl sm:text-2xl font-mono tracking-wider text-slate-900">
              {code}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}