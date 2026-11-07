
"use strict";

// ==========================================
// HTML ELEMENTLERİ
// ==========================================

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");
const resultCount = document.getElementById("resultCount");

// ==========================================
// VERİLER
// ==========================================

let diseases = [];
let plants = [];
let preparations = [];

let dataLoaded = false;

// ==========================================
// METİN NORMALİZASYONU
// ==========================================

function normalizeText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .replace(/ı/g, "i")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ==========================================
// YÜKLENİYOR EKRANI
// ==========================================

function showLoading() {
    resultsContainer.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.className = "loading";

    const spinner = document.createElement("div");
    spinner.className = "spinner";

    const message = document.createElement("p");
    message.textContent = "Bitkisel bilgiler yükleniyor...";

    wrapper.append(spinner, message);

    resultsContainer.appendChild(wrapper);
    resultsContainer.setAttribute("aria-busy", "true");

    resultCount.textContent = "";
}

// ==========================================
// MESAJ GÖSTERME
// ==========================================

function showMessage(message, type = "message") {
    resultsContainer.replaceChildren();

    const element = document.createElement("p");
    element.className = type;
    element.textContent = message;

    resultsContainer.appendChild(element);

    resultsContainer.setAttribute("aria-busy", "false");
    resultCount.textContent = "";
}

// ==========================================
// JSON VERİLERİNİ YÜKLE
// ==========================================

async function loadData() {
    showLoading();

    try {
        const urls = [
            "./data/diseases.json",
            "./data/plants.json",
            "./data/preparations.json"
        ];

        const responses = await Promise.all(
            urls.map(url => fetch(url))
        );

        for (const response of responses) {
            if (!response.ok) {
                throw new Error(
                    `Dosya yüklenemedi: ${response.url}`
                );
            }
        }

        const data = await Promise.all(
            responses.map(response => response.json())
        );

        if (!data.every(Array.isArray)) {
            throw new Error("JSON dosyalarının ana yapısı dizi olmalıdır.");
        }

        [diseases, plants, preparations] = data;

        validateData();

        dataLoaded = true;

        showMessage(
            "Veriler başarıyla yüklendi. Arama yapabilirsiniz."
        );

    } catch (error) {
        console.error("Veri yükleme hatası:", error);

        dataLoaded = false;

        showMessage(
            "Veriler yüklenemedi. JSON dosyalarını ve sunucu ayarlarını kontrol edin.",
            "error-message"
        );
    }
}

// ==========================================
// VERİ KONTROLLERİ
// ==========================================

function validateData() {
    const checkIds = (items, field, name) => {
        const ids = items.map(item => item[field]);

        if (ids.some(id => !id)) {
            throw new Error(`${name} dosyasında eksik ID var.`);
        }

        if (new Set(ids).size !== ids.length) {
            throw new Error(`${name} dosyasında tekrarlanan ID var.`);
        }
    };

    checkIds(diseases, "disease_id", "Hastalık");
    checkIds(plants, "plant_id", "Bitki");
    checkIds(preparations, "preparation_id", "Hazırlama");

    const plantIds = new Set(plants.map(p => p.plant_id));
    const preparationIds = new Set(
        preparations.map(p => p.preparation_id)
    );

    for (const disease of diseases) {
        for (const id of disease.plant_ids ?? []) {
            if (!plantIds.has(id)) {
                console.warn(
                    `Bulunamayan bitki ID: ${id}`,
                    disease.name
                );
            }
        }
    }

    for (const plant of plants) {
        for (const id of plant.preparation_ids ?? []) {
            if (!preparationIds.has(id)) {
                console.warn(
                    `Bulunamayan hazırlama ID: ${id}`,
                    plant.common_name
                );
            }
        }
    }
}

// ==========================================
// ID İLE KAYIT BULMA
// ==========================================

function getPlant(plantId) {
    return plants.find(
        plant => plant.plant_id === plantId
    );
}

function getPreparations(plant) {
    return (plant.preparation_ids ?? [])
        .map(id =>
            preparations.find(
                item => item.preparation_id === id
            )
        )
        .filter(Boolean);
}

function getPlantById(plantId) {
    return getPlant(plantId);
}

// ==========================================
// GÜVENLİ HTML ELEMANLARI
// ==========================================

function addText(parent, tag, value, className = "") {
    const element = document.createElement(tag);

    element.textContent = value ?? "";

    if (className) {
        element.className = className;
    }

    parent.appendChild(element);

    return element;
}

// ==========================================
// LİSTE OLUŞTUR
// ==========================================

function addList(parent, title, items) {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    addText(parent, "h4", title);

    const list = document.createElement("ul");

    items.forEach(item => {
        const li = document.createElement("li");

        if (typeof item === "string") {
            li.textContent = item;
        } else {
            li.textContent =
                `${item.name ?? ""}: ${item.amount ?? ""}`;
        }

        list.appendChild(li);
    });

    parent.appendChild(list);
}

// ==========================================
// KAYNAKÇA
// ==========================================

function renderSources(parent, sources) {
    if (!Array.isArray(sources) || sources.length === 0) {
        return;
    }

    const section = document.createElement("div");
    section.className = "sources";

    addText(section, "h4", "📚 Kaynakça");

    const list = document.createElement("ol");

    sources.forEach(source => {
        if (!source.title) return;

        const li = document.createElement("li");
        li.className = "source-title";
        li.textContent = source.title;

        list.appendChild(li);
    });

    if (list.children.length === 0) return;

    section.appendChild(list);
    parent.appendChild(section);
}

// ==========================================
// BİLİMSEL KANIT BİLGİSİ
// ==========================================

function renderEvidence(parent, evidence) {
    if (!evidence) return;

    const section = document.createElement("div");
    section.className = "evidence";

    addText(section, "h4", "Bilimsel araştırmalar");

    if (evidence.summary) {
        addText(section, "p", evidence.summary);
    }

    if (evidence.evidence_level) {
        addText(
            section,
            "p",
            `Kanıt durumu: ${evidence.evidence_level}`,
            "evidence-level"
        );
    }

    addList(
        section,
        "Araştırmaların sınırlılıkları",
        evidence.limitations
    );

    parent.appendChild(section);
}

// ==========================================
// HAZIRLAMA YÖNTEMİ KARTI
// ==========================================

function renderPreparation(parent, preparation) {
    const card = document.createElement("div");
    card.className = "plant-card preparation-card";

    addText(
        card,
        "span",
        preparation.method_name ?? "Hazırlama yöntemi",
        "tag"
    );

    addText(card, "h4", preparation.title);
    addText(card, "p", preparation.intended_use);

    addList(card, "İçindekiler", preparation.ingredients);
    addList(card, "Hazırlama adımları", preparation.steps);
    addList(card, "Güvenlik bilgileri", preparation.safety_notes);

    if (preparation.dosage) {
        addText(
            card,
            "p",
            `Kullanım miktarı: ${preparation.dosage}`
        );
    }

    if (preparation.duration) {
        addText(
            card,
            "p",
            `Kullanım süresi: ${preparation.duration}`
        );
    }

    renderSources(card, preparation.sources);

    parent.appendChild(card);
}

// ==========================================
// BİTKİ KARTI
// ==========================================

function renderPlant(parent, plant, options = {}) {
    const card = document.createElement("div");
    card.className = "plant-card";

    addText(card, "span", "Bitkisel bilgi", "tag");

    addText(card, "h4", plant.common_name);

    if (plant.scientific_name) {
        addText(
            card,
            "p",
            `Bilimsel adı: ${plant.scientific_name}`
        );
    }

    if (plant.origin) {
        addText(
            card,
            "p",
            `Kökeni: ${plant.origin}`
        );
    }

    addText(card, "p", plant.description);

    addList(
        card,
        "Diğer isimleri",
        plant.alternative_names
    );

    addList(
        card,
        "Kullanılan bitki bölümleri",
        plant.plant_parts
    );

    addList(
        card,
        "Geleneksel kullanım alanları",
        plant.traditional_uses
    );

    renderEvidence(card, plant.scientific_evidence);

    addList(
        card,
        "Güvenlik uyarıları",
        plant.safety_notes
    );

    const methods = getPreparations(plant);

    if (methods.length > 0 && options.showPreparations !== false) {
        addText(card, "h4", "Hazırlama yöntemleri");

        methods.forEach(method => {
            renderPreparation(card, method);
        });
    }

    renderSources(card, plant.sources);

    parent.appendChild(card);

    return card;
}

// ==========================================
// HASTALIK / BELİRTİ KARTI
// ==========================================

function renderDisease(disease, shownPlantIds) {
    const card = document.createElement("article");
    card.className = "result-card";

    addText(
        card,
        "span",
        disease.category ?? "Belirti",
        "tag"
    );

    addText(card, "h3", disease.name);
    addText(card, "p", disease.description);

    addList(card, "Belirtiler", disease.symptoms);

    const relatedPlants = (disease.plant_ids ?? [])
        .map(getPlant)
        .filter(Boolean);

    if (relatedPlants.length > 0) {
        addText(card, "h4", "İlişkili bitkiler");

        relatedPlants.forEach(plant => {
            shownPlantIds.add(plant.plant_id);

            renderPlant(card, plant);
        });
    }

    if (disease.medical_warning) {
        addText(
            card,
            "p",
            `Sağlık uyarısı: ${disease.medical_warning}`,
            "warning"
        );
    }

    renderSources(card, disease.sources);

    resultsContainer.appendChild(card);
}

// ==========================================
// BAĞIMSIZ HAZIRLAMA KARTI
// ==========================================

function renderStandalonePreparation(preparation) {
    const card = document.createElement("article");
    card.className = "result-card";

    addText(card, "span", "Hazırlama yöntemi", "tag");
    addText(card, "h3", preparation.title);

    const plant = getPlantById(preparation.plant_id);

    if (plant) {
        addText(
            card,
            "p",
            `İlişkili bitki: ${plant.common_name}`
        );
    }

    renderPreparation(card, preparation);

    resultsContainer.appendChild(card);
}

// ==========================================
// ARAMA METNİ OLUŞTURMA
// ==========================================

function createDiseaseSearchText(disease) {
    return normalizeText([
        disease.name,
        disease.category,
        disease.description,
        ...(disease.symptoms ?? []),
        ...(disease.keywords ?? [])
    ].join(" "));
}

function createPlantSearchText(plant) {
    return normalizeText([
        plant.common_name,
        plant.scientific_name,
        plant.description,
        plant.origin,
        ...(plant.alternative_names ?? []),
        ...(plant.plant_parts ?? []),
        ...(plant.traditional_uses ?? []),
        ...(plant.keywords ?? [])
    ].join(" "));
}

function createPreparationSearchText(preparation) {
    return normalizeText([
        preparation.title,
        preparation.method_name,
        preparation.intended_use,
        ...(preparation.keywords ?? []),
        ...(preparation.safety_notes ?? [])
    ].join(" "));
}

// ==========================================
// ARAMA SİSTEMİ
// ==========================================

function searchData(query) {
    if (!dataLoaded) {
        showMessage(
            "Veriler henüz yüklenmedi. Lütfen tekrar deneyin."
        );
        return;
    }

    const term = normalizeText(query);

    if (!term) {
        showMessage(
            "Lütfen aramak istediğiniz ifadeyi yazın."
        );
        searchInput.focus();
        return;
    }

    resultsContainer.replaceChildren();
    resultsContainer.setAttribute("aria-busy", "false");

    // Hastalık eşleşmeleri
    const matchingDiseases = diseases.filter(disease =>
        createDiseaseSearchText(disease).includes(term)
    );

    // Bitki eşleşmeleri
    const matchingPlants = plants.filter(plant =>
        createPlantSearchText(plant).includes(term)
    );

    // Hazırlama eşleşmeleri
    const matchingPreparations = preparations.filter(preparation =>
        createPreparationSearchText(preparation).includes(term)
    );

    const shownPlantIds = new Set();
    const shownPreparationIds = new Set();

    // 1. Hastalık sonuçları
    matchingDiseases.forEach(disease => {
        renderDisease(disease, shownPlantIds);

        (disease.plant_ids ?? []).forEach(id => {
            shownPreparationIds.add(id);
        });
    });

    // 2. Bağımsız bitki sonuçları
    matchingPlants.forEach(plant => {
        if (shownPlantIds.has(plant.plant_id)) {
            return;
        }

        const card = document.createElement("article");
        card.className = "result-card";

        renderPlant(card, plant);

        resultsContainer.appendChild(card);
        shownPlantIds.add(plant.plant_id);
    });

    // 3. Bağımsız hazırlama sonuçları
    const displayedPreparations = new Set();

    matchingPreparations.forEach(preparation => {
        if (displayedPreparations.has(preparation.preparation_id)) {
            return;
        }

        displayedPreparations.add(preparation.preparation_id);

        // Bitki kartı zaten gösterilmişse hazırlama yöntemi
        // o kartın içinde de bulunabilir. Yalnızca arama
        // eşleşmesinde bağımsız gösterim yapıyoruz.
        if (!shownPlantIds.has(preparation.plant_id)) {
            renderStandalonePreparation(preparation);
        }
    });

    // Toplam sonuç sayısı
    const total =
        matchingDiseases.length +
        matchingPlants.filter(
            plant => !matchingDiseases.some(
                disease => (disease.plant_ids ?? []).includes(plant.plant_id)
            )
        ).length +
        matchingPreparations.filter(
            preparation => !shownPlantIds.has(preparation.plant_id)
        ).length;

    resultCount.textContent = `${total} sonuç`;

    if (resultsContainer.children.length === 0) {
        showMessage(
            "Eşleşen bir kayıt bulunamadı. Farklı bir kelime deneyin."
        );
    }
}

// ==========================================
// FORM OLAYLARI
// ==========================================

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchData(searchInput.value);
});

// ==========================================
// BAŞLAT
// ==========================================

loadData();
