# Automação Supabase + WhatsApp

Para que o Supabase consiga chamar seu script de WhatsApp automaticamente, siga estes passos:

### 1. Requisito: Endereço Público
Como o seu script hoje roda no `localhost:3001`, o Supabase (que está na nuvem) não consegue "enxergar" seu computador. Para funcionar, você precisará hospedar a pasta `whatsapp-service` em algum lugar (Render, Railway, VPS) que te dê uma URL (ex: `https://meu-whatsapp-service.render.com`).

---

### 2. Criar a Edge Function no Supabase
Essa função servirá de "gatilho" para o seu serviço de WhatsApp.

**Código da Function (`index.ts`):**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // URL do seu serviço de WhatsApp (troque pelo seu link real depois de hospedar)
    const WHATSAPP_SERVICE_URL = "https://seu-servidor-whatsapp.com/send-report"
    
    console.log("Chamando serviço de WhatsApp...")
    const res = await fetch(WHATSAPP_SERVICE_URL)
    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
```

---

### 3. Agendar no Supabase (Cron Job)
No seu **SQL Editor** do Supabase, rode os comandos abaixo para agendar o relatório toda sexta-feira às 12:00:

```sql
-- 1. Certifique-se que as extensões estão ativas
create extension if not exists pg_cron;
create extension if not exists net;

-- 2. Agenda a chamada da sua Edge Function
-- Substitua 'send-whatsapp-report' pelo nome que você deu na Edge Function
-- '0 12 * * 5' significa: Minuto 0, Hora 12, Sexta-feira
select
  cron.schedule(
    'whatsapp-weekly-report',
    '0 12 * * 5',
    $$
    select
      net.http_get(
        'https://hribnuztzuurqeslfvbp.supabase.co/functions/v1/send-whatsapp-report',
        headers := jsonb_build_object('Authorization', 'Bearer SEU_ANON_KEY_OU_SERVICE_ROLE')
      );
    $$
  );
```

---

### Dica para Desenvolvimento (Sem Host):
Se você quiser testar sem hospedar na nuvem agora, você pode usar uma ferramenta como **ngrok** para criar um túnel temporário:
1. Baixe o `ngrok`.
2. Rode: `ngrok http 3001`.
3. Ele te dará um link `https://...` que aponta direto para o seu computador. Use esse link na Edge Function!
