const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const { createClient } = require("@supabase/supabase-js");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const pino = require("pino");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

// Configurações Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Variáveis globais para manter o estado
let sock;
let currentQR = null;
let isConnected = false;

// Função para formatar moeda
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
    
    // Tenta buscar a versão mais recente para evitar erro 405
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Usando versão WhatsApp: ${version.join(".")} (Latest: ${isLatest})`);

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Novaware", "Chrome", "1.0.0"],
        syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            currentQR = qr;
            console.log("\n--- NOVO QR CODE DISPONÍVEL ---");
        }

        if (connection === "close") {
            isConnected = false;
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Conexão fechada. Motivo:", lastDisconnect.error, "Tentando reconectar...", shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === "open") {
            isConnected = true;
            currentQR = null;
            console.log("\n✅ CONEXÃO ESTABELECIDA COM SUCESSO!");
        }
    });

    // Agendamento: Sexta-feira às 12:00 (Meio-dia)
    cron.schedule("0 12 * * 5", () => {
        if (isConnected) {
            console.log("⏰ Iniciando envio do relatório semanal agendado...");
            sendWeeklyReport(sock);
        }
    });
}

// Rota para verificar status da conexão
app.get("/status", (req, res) => {
    res.json({ connected: isConnected, qr: currentQR });
});

// Rota para disparo manual via Admin
app.get("/send-report", async (req, res) => {
    try {
        console.log(`[API] Solicitação de relatório. Status atual: connected=${isConnected}`);
        
        if (!isConnected || !sock) {
            return res.status(503).json({ 
                success: false, 
                error: "WhatsApp não está conectado no momento. Por favor, aguarde a conexão estabilizar." 
            });
        }

        console.log("🚀 Gatilho manual recebido via API Admin...");
        await sendWeeklyReport(sock);
        res.json({ success: true, message: "Relatório enviado com sucesso!" });
    } catch (error) {
        console.error("Erro na rota /send-report:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

async function sendWeeklyReport(socketInstance) {
    try {
        const groupId = process.env.WA_GROUP_ID;
        if (!groupId || groupId === "SEU_GROUP_ID_AQUI") {
            console.error("❌ Erro: WA_GROUP_ID não configurado no .env");
            return;
        }

        const { data: leads, error: leadsError } = await supabase.from("leads").select("*");
        const { data: users, error: usersError } = await supabase.from("profiles").select("*");

        if (leadsError) console.error("❌ Erro ao buscar leads:", leadsError.message);
        if (usersError) console.error("❌ Erro ao buscar usuários:", usersError.message);

        if (!leads || !users) {
            console.error("❌ Erro: Dados não retornados do Supabase");
            return;
        }

        const totalLeads = leads.length;
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const newLeadsWeek = leads.filter(l => new Date(l.created_at) > last7Days).length;
        const closedGains = leads.filter(l => l.status === "Fechado - Ganho" && new Date(l.updated_at || l.created_at) > last7Days);
        const totalValueWeek = closedGains.reduce((acc, curr) => acc + (curr.deal_value || 0), 0);

        let msg = `*📊 RESUMO SEMANAL - NOVAWARE SALES*\n`;
        msg += `_Relatório gerado em: ${new Date().toLocaleDateString("pt-BR")}_\n\n`;

        msg += `*📈 PERFORMANCE GERAL*\n`;
        msg += `• Total de Leads no Funil: ${totalLeads}\n`;
        msg += `• Novos Leads (7 dias): ${newLeadsWeek}\n`;
        msg += `• Vendas Fechadas (7 dias): ${closedGains.length}\n`;
        msg += `• Receita Gerada (7 dias): ${fmt(totalValueWeek)}\n\n`;

        msg += `*👥 DESEMPENHO POR CONSULTOR*\n`;
        
        users.filter(u => u.role !== "admin").forEach(u => {
            const uLeads = leads.filter(l => l.sdr_id === u.id || l.closer_id === u.id).length;
            const uGains = leads.filter(l => l.closer_id === u.id && l.status === "Fechado - Ganho" && new Date(l.updated_at || l.created_at) > last7Days).length;
            
            if (uLeads > 0 || uGains > 0) {
                msg += `• *${u.name.toUpperCase()}*: ${uLeads} leads ativos | ${uGains} fechamentos\n`;
            }
        });

        msg += `\n🚀 _Vamos pra cima! Ótimo final de semana a todos._`;

        await socketInstance.sendMessage(groupId, { text: msg });
        console.log("✅ Relatório enviado com sucesso para o grupo!");

    } catch (error) {
        console.error("❌ Erro ao gerar/enviar relatório:", error);
        throw error; // Repassa para o chamador (HTTP Route)
    }
}

// Inicia o servidor Express independente do Socket
app.listen(PORT, () => {
    console.log(`📡 Servidor de API WhatsApp rodando na porta ${PORT}`);
    // Inicia a conexão do WhatsApp
    connectToWhatsApp();
});
