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
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Conexão fechada. Motivo:", lastDisconnect.error, "Tentando reconectar...", shouldReconnect);

            isConnected = false;
            currentQR = null;

            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log("❌ Sessão encerrada ou inválida. Reiniciando para gerar novo QR Code em 3s...");
                setTimeout(() => {
                    connectToWhatsApp();
                }, 3000);
            }
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

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const last7DaysStr = last7Days.toISOString();

        // Busca dados necessários
        const { data: leads, error: leadsError } = await supabase.from("leads").select("*");
        const { data: users, error: usersError } = await supabase.from("profiles").select("*");

        if (leadsError || usersError) {
            console.error("❌ Erro ao buscar dados do Supabase:", leadsError || usersError);
            return;
        }

        console.log(`[DEBUG] Total de Leads: ${leads.length}`);
        console.log(`[DEBUG] Filtro Data: ${last7DaysStr}`);

        // Filtro de leads que foram movidos ou criados nos últimos 7 dias
        const activeLeadsWeek = leads.filter(l => {
            const date = new Date(l.updated_at || l.last_interaction || l.created_at);
            return date > last7Days;
        });

        console.log(`[DEBUG] Leads Ativos na Semana: ${activeLeadsWeek.length}`);
        if (leads.length > 0) {
            const statuses = leads.map(l => l.status);
            const statusCounts = statuses.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
            console.log("[DEBUG] Contagem Geral por Status:", statusCounts);
        }

        // Métricas Gerais (Soma de tudo)
        const genMeetingsScheduled = activeLeadsWeek.filter(l => (l.status || "").trim() === "Reunião Agendada").length;
        const genMeetingsHeld = activeLeadsWeek.filter(l => (l.status || "").trim() === "Reunião Realizada").length;
        const genProposals = activeLeadsWeek.filter(l => (l.status || "").trim() === "Proposta Enviada").length;
        const genGains = activeLeadsWeek.filter(l => (l.status || "").trim() === "Fechado - Ganho");
        const genGainsCount = genGains.length;
        const genTotalValue = genGains.reduce((acc, curr) => acc + (curr.deal_value || 0), 0);

        console.log(`[DEBUG] Resumo Geral Calculado: Agendadas=${genMeetingsScheduled}, Realizadas=${genMeetingsHeld}, Propostas=${genProposals}, Ganhos=${genGainsCount}`);
        console.log(`[DEBUG] Total Users para Relatório: ${users.filter(u => u.role !== 'admin').length}`);

        let msg = `*📊 RELATÓRIO DE PERFORMANCE SEMANAL*\n`;
        msg += `_Período: ${last7Days.toLocaleDateString("pt-BR")} a ${new Date().toLocaleDateString("pt-BR")}_\n\n`;

        msg += `*📈 RESUMO GERAL (ESTA SEMANA)*\n`;
        msg += `• Reuniões Agendadas: ${genMeetingsScheduled}\n`;
        msg += `• Reuniões Realizadas: ${genMeetingsHeld}\n`;
        msg += `• Propostas Enviadas: ${genProposals}\n`;
        msg += `• Contratos Fechados: ${genGainsCount}\n`;
        msg += `• Receita Gerada: ${fmt(genTotalValue)}\n\n`;

        msg += `*🗂️ STATUS DO FUNIL (TOTAL)*\n`;
        msg += `• Total de Leads Ativos: ${leads.length}\n\n`;

        // Métricas por Consultor
        msg += `*👥 DESEMPENHO POR CONSULTOR*\n\n`;

        // Ordena usuários para mostrar vendedores que tiveram atividade primeiro, mas mostra todos
        const staff = users.filter(u => u.role?.toLowerCase() !== "admin");

        staff.forEach(u => {
            const userRole = u.role?.toLowerCase();

            // Filtra leads atualizados deste usuário na semana
            const uLeads = activeLeadsWeek.filter(l => l.sdr_id === u.id || l.closer_id === u.id);

            msg += `*${u.name.toUpperCase()}* (${u.role.toUpperCase()})\n`;

            if (userRole === "sdr" || userRole === "vendedor") {
                const scheduled = uLeads.filter(l => l.sdr_id === u.id && (l.status || "").trim() === "Reunião Agendada").length;
                msg += `  ↳ 📅 Agendamentos (Semana): ${scheduled}\n`;
            }

            if (userRole === "closer" || userRole === "vendedor") {
                const held = uLeads.filter(l => l.closer_id === u.id && (l.status || "").trim() === "Reunião Realizada").length;
                const proposals = uLeads.filter(l => l.closer_id === u.id && (l.status || "").trim() === "Proposta Enviada").length;
                const wins = uLeads.filter(l => l.closer_id === u.id && (l.status || "").trim() === "Fechado - Ganho").length;

                msg += `  ↳ ✅ Reuniões Feitas (Semana): ${held}\n`;
                msg += `  ↳ 📄 Propostas (Semana): ${proposals}\n`;
                msg += `  ↳ 💰 Ganhos (Semana): ${wins}\n`;
            }
            msg += `\n`;
        });

        msg += `🚀 _Salles Command - Voando baixo!_`;

        await socketInstance.sendMessage(groupId, { text: msg });
        console.log("✅ Relatório detalhado enviado com sucesso!");

    } catch (error) {
        console.error("❌ Erro ao gerar/enviar relatório:", error);
        throw error;
    }
}

// Inicia o servidor Express independente do Socket
app.listen(PORT, () => {
    console.log(`📡 Servidor de API WhatsApp rodando na porta ${PORT}`);
    // Inicia a conexão do WhatsApp
    connectToWhatsApp();
});
