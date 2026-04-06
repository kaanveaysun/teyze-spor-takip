const STORAGE_KEY = "teyze_spor_crm";
let customers = [];

function formatNameWithTitle(rawName) {
    if (!rawName || rawName.trim() === "") return "İsimsiz Müşteri";
    const name = rawName.trim();
    const kadinIsimleri = ["nurten", "fatma", "ayşe", "emine", "zeynep", "hatice", "gül", "sibel", "merve", "gülnur"];
    const erkekIsimleri = ["kerem", "ahmet", "mehmet", "mustafa", "ali", "veli", "can", "burak", "emre", "kaan"];
    const lower = name.toLowerCase();
    if (kadinIsimleri.some(k => lower === k)) return `${name} Hanım`;
    if (erkekIsimleri.some(e => lower === e)) return `${name} Bey`;
    return `${name} Bey/Hanım`;
}

function generateId() {
    return Date.now() + "-" + Math.random().toString(36);
}

function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        customers = JSON.parse(stored);
    } else {
        customers = [];
    }
    renderList();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    renderList();
}

function parsePhoneAndName(raw) {
    let phone = "";
    let name = "";
    const parts = raw.trim().split(/\s+/);
    if (parts.length > 0 && /^\d+$/.test(parts[0])) {
        phone = parts[0];
        name = parts.slice(1).join(" ");
    } else {
        phone = raw.replace(/\D/g, "");
        name = raw.replace(/[\d\s]/g, "").trim();
        if (phone === "") phone = "GEÇERSİZ";
    }
    return { phone, name };
}

document.getElementById("addBtn").addEventListener("click", () => {
    const rawValue = document.getElementById("rawDataInput").value.trim();
    if (!rawValue) return alert("Lütfen numara ve isim yapıştırın.");
    const { phone, name } = parsePhoneAndName(rawValue);
    if (phone === "GEÇERSİZ" || phone.length < 5) {
        alert("Geçerli bir telefon numarası girin");
        return;
    }
    const exists = customers.find(c => c.phone === phone);
    if (exists) {
        alert("Bu numara zaten listede!");
        document.getElementById("rawDataInput").value = "";
        return;
    }
    const displayName = formatNameWithTitle(name);
    const newCustomer = {
        id: generateId(),
        phone: phone,
        rawName: name,
        displayName: displayName,
        status: "beklemede",
        callResult: null,
        complaint: "",
        lastThinkingDate: null,
        createdAt: new Date().toISOString()
    };
    customers.push(newCustomer);
    saveData();
    document.getElementById("rawDataInput").value = "";
});

document.getElementById("searchPhone").addEventListener("input", (e) => {
    const query = e.target.value.trim();
    const resultDiv = document.getElementById("searchResult");
    if (query === "") {
        resultDiv.innerHTML = "🔍 Telefonun ilk veya son hanelerini yazın";
        return;
    }
    const matched = customers.find(c => c.phone.startsWith(query) || c.phone.endsWith(query));
    if (matched) {
        resultDiv.innerHTML = `📞 ${matched.displayName} arıyor (${matched.phone})`;
    } else {
        resultDiv.innerHTML = `❌ Bu kişinin ismine ulaşılamadı ya da yok (${query})`;
    }
});

function updateCustomerStatus(customerId, newStatus, extra = {}) {
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx === -1) return;
    const c = customers[idx];
    
    if (newStatus === "acti") {
        c.status = "acti";
        c.callResult = null;
    } else if (newStatus === "acmadi") {
        c.status = "acmadi";
        c.callResult = "GERİ_DÖNMEDİ";
    } else if (newStatus === "hatali") {
        c.status = "hatali";
        c.callResult = "HATALI/EKSİK";
    } else if (newStatus === "geri_döndü") {
        c.status = "acti";
        c.callResult = null;
    } else if (newStatus === "geri_dönmedi") {
        c.status = "acmadi";
        c.callResult = "GERİ_DÖNMEDİ";
    } else if (newStatus.startsWith("sonuc_")) {
        const val = newStatus.replace("sonuc_", "");
        c.callResult = val;
        if (val === "DÜŞÜNÜCEK") {
            c.lastThinkingDate = new Date().toLocaleString("tr-TR");
        }
        if (val === "MEMNUN_DEĞİL" && extra.complaintText) {
            c.complaint = extra.complaintText;
        }
        saveData();
        return;
    }
    saveData();
}

function renderList() {
    const container = document.getElementById("recordsList");
    if (!container) return;
    if (customers.length === 0) {
        container.innerHTML = `<div class="record-card" style="text-align:center;">📭 Henüz numara eklenmemiş</div>`;
        return;
    }
    
    container.innerHTML = customers.map(cust => {
        let actionButtons = "";
        if (cust.status === "beklemede") {
            actionButtons = `
                <div class="button-group">
                    <button class="btn-sm primary-action" data-id="${cust.id}" data-action="acti">📞 AÇTI</button>
                    <button class="btn-sm warning" data-id="${cust.id}" data-action="acmadi">📵 AÇMADI</button>
                    <button class="btn-sm" data-id="${cust.id}" data-action="hatali">⚠️ HATALI</button>
                </div>
            `;
        } else if (cust.status === "acti" && (!cust.callResult || ["MEMNUN","MEMNUN_DEĞİL","DÜŞÜNÜCEK","BİR_DAHA_ALICAK","BİR_DAHA_ALMICAK"].indexOf(cust.callResult) === -1)) {
            actionButtons = `
                <div class="button-group">
                    <button class="btn-sm" data-id="${cust.id}" data-action="sonuc_MEMNUN">😊 MEMNUN</button>
                    <button class="btn-sm" data-id="${cust.id}" data-action="sonuc_MEMNUN_DEĞİL">😞 MEMNUN DEĞİL</button>
                    <button class="btn-sm" data-id="${cust.id}" data-action="sonuc_DÜŞÜNÜCEK">🤔 DÜŞÜNÜCEK</button>
                    <button class="btn-sm" data-id="${cust.id}" data-action="sonuc_BİR_DAHA_ALICAK">🔄 TEKRAR ALICAK</button>
                    <button class="btn-sm" data-id="${cust.id}" data-action="sonuc_BİR_DAHA_ALMICAK">❌ ALMAYACAK</button>
                </div>
            `;
        } else if (cust.status === "acmadi" && (!cust.callResult || cust.callResult !== "GERİ_DÖNDÜ")) {
            actionButtons = `
                <div class="button-group">
                    <button class="btn-sm" data-id="${cust.id}" data-action="geri_döndü">🔄 GERİ DÖNDÜ</button>
                    <button class="btn-sm" data-id="${cust.id}" data-action="geri_dönmedi">⛔ GERİ DÖNMEDİ</button>
                </div>
            `;
        } else if (cust.callResult) {
            let durumMetni = "";
            if (cust.callResult === "MEMNUN") durumMetni = "✅ MEMNUN";
            else if (cust.callResult === "MEMNUN_DEĞİL") durumMetni = `❌ MEMNUN DEĞİL (Şikayet: ${cust.complaint || "-"})`;
            else if (cust.callResult === "DÜŞÜNÜCEK") durumMetni = `🤔 DÜŞÜNÜCEK (${cust.lastThinkingDate || ""})`;
            else if (cust.callResult === "BİR_DAHA_ALICAK") durumMetni = "🔄 TEKRAR ALICAK";
            else if (cust.callResult === "BİR_DAHA_ALMICAK") durumMetni = "❌ ALMAYACAK";
            else durumMetni = cust.callResult;
            actionButtons = `<div class="button-group"><strong>Sonuç:</strong> ${durumMetni}</div>`;
        }
        
        return `
            <div class="record-card">
                <div class="record-header">
                    <span><strong>📞 ${cust.phone}</strong> — ${cust.displayName}</span>
                </div>
                ${cust.lastThinkingDate ? `<div><small>📅 Düşünme: ${cust.lastThinkingDate}</small></div>` : ""}
                ${actionButtons}
            </div>
        `;
    }).join("");
    
    document.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = btn.getAttribute("data-id");
            const action = btn.getAttribute("data-action");
            if (action === "sonuc_MEMNUN_DEĞİL") {
                const complaintMsg = prompt("Şikayeti yazın:");
                if (complaintMsg !== null) {
                    updateCustomerStatus(id, action, { complaintText: complaintMsg });
                }
            } else {
                updateCustomerStatus(id, action);
                if (action === "sonuc_DÜŞÜNÜCEK") alert("Düşünecek olarak kaydedildi, tarih işlendi.");
            }
        });
    });
}

document.getElementById("exportPdfBtn").addEventListener("click", () => {
    if (typeof jspdf === 'undefined') {
        alert("PDF kütüphanesi yükleniyor, bekleyin...");
        return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString("tr-TR");
    doc.setFontSize(16);
    doc.text(`${today} İŞ PDF RAPORU`, 20, 20);
    let y = 35;
    customers.forEach(c => {
        let durum = "";
        if (c.callResult === "MEMNUN") durum = "MEMNUN";
        else if (c.callResult === "MEMNUN_DEĞİL") durum = `MEMNUN DEĞİL, ŞİKAYETİ: ${c.complaint || "yok"}`;
        else if (c.callResult === "DÜŞÜNÜCEK") durum = `DÜŞÜNÜCEK (${c.lastThinkingDate})`;
        else if (c.callResult === "BİR_DAHA_ALICAK") durum = "TEKRAR ALICAK";
        else if (c.callResult === "BİR_DAHA_ALMICAK") durum = "ALMAYACAK";
        else if (c.status === "hatali") durum = "HATALI NUMARA";
        else durum = "GÖRÜŞME YAPILMADI";
        
        doc.setFontSize(10);
        doc.text(`${c.phone} - ${c.displayName} ; ${durum}`, 20, y);
        y += 8;
        if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`is_raporu_${today.replace(/\//g, "-")}.pdf`);
});

loadData();