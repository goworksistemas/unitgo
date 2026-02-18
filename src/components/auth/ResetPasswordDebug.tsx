import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DEBUG COMPONENT - Shows exactly what URL Supabase is sending in the email
 * This helps diagnose why the reset password link is not working
 */
export function ResetPasswordDebug() {
  const [copied, setCopied] = useState(false);
  
  const debugInfo = {
    currentURL: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    origin: window.location.origin,
    sessionStorage: {
      auth_hash: sessionStorage.getItem('supabase_auth_hash'),
      auth_query: sessionStorage.getItem('supabase_auth_query'),
      hash_timestamp: sessionStorage.getItem('supabase_auth_hash_timestamp'),
      query_timestamp: sessionStorage.getItem('supabase_auth_query_timestamp'),
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    toast.success('Debug info copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-yellow-500 shadow-2xl">
        <CardHeader className="pb-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-sm">Debug Info - Reset Password</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="h-7 px-2"
            >
              {copied ? (
                <CheckCircle2 className="w-3 h-3 text-green-600" />
              ) : (
                <Clipboard className="w-3 h-3" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-3 pb-3">
          <div className="space-y-2 text-xs font-mono">
            <div>
              <strong>Current URL:</strong>
              <div className="text-[10px] break-all bg-muted p-1 rounded mt-1">
                {debugInfo.currentURL}
              </div>
            </div>
            
            <div>
              <strong>Path:</strong> <span className="text-blue-600">{debugInfo.pathname}</span>
            </div>
            
            <div>
              <strong>Search (query):</strong>
              <div className="text-[10px] break-all bg-muted p-1 rounded mt-1">
                {debugInfo.search || '(empty)'}
              </div>
            </div>
            
            <div>
              <strong>Hash:</strong>
              <div className="text-[10px] break-all bg-muted p-1 rounded mt-1">
                {debugInfo.hash || '(empty)'}
              </div>
            </div>

            <div className="pt-2 border-t">
              <strong>SessionStorage:</strong>
              <div className="text-[10px] break-all bg-muted p-1 rounded mt-1">
                {debugInfo.sessionStorage.auth_hash ? (
                  <div className="text-green-600">✅ Hash cached: {debugInfo.sessionStorage.auth_hash.substring(0, 30)}...</div>
                ) : (
                  <div className="text-red-600">❌ No hash cached</div>
                )}
                {debugInfo.sessionStorage.auth_query ? (
                  <div className="text-green-600">✅ Query cached: {debugInfo.sessionStorage.auth_query.substring(0, 30)}...</div>
                ) : (
                  <div className="text-red-600">❌ No query cached</div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <div className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-yellow-800 dark:text-yellow-200">
                    <strong>DIAGNÓSTICO:</strong><br/>
                    {!debugInfo.hash && !debugInfo.search && !debugInfo.sessionStorage.auth_hash && !debugInfo.sessionStorage.auth_query ? (
                      <>❌ Nenhum token detectado! O link do email NÃO contém tokens de autenticação.</>
                    ) : debugInfo.sessionStorage.auth_hash ? (
                      <>✅ Hash capturado com sucesso!</>
                    ) : debugInfo.sessionStorage.auth_query ? (
                      <>✅ Query params capturados com sucesso!</>
                    ) : debugInfo.hash ? (
                      <>⚠️ Hash presente mas não foi capturado antes do React</>
                    ) : debugInfo.search ? (
                      <>⚠️ Query params presentes mas não foram capturados</>
                    ) : (
                      <>❓ Situação desconhecida</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
