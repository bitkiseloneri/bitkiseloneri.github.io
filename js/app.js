
/* =========================================
   BİTKİREHBERİ - ANA JAVASCRIPT
========================================= */

const DATA_PATH = "data/";

const PLACEHOLDER_IMAGE = "images/plants/plant-placeholder.svg";

let plants = [];
let diseases = [];
let preparations = [];
let categories = [];


/* =========================================
   GENEL YARDIMCI FONKSİYONLAR
========================================= */

const $ = (selector) => document.querySelector(selector);

function normalizeText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== "") {
        element.textContent = text;
    }

    return element;
}

function setImageFallback(image) {
    image.onerror = () => {
        image.onerror = null;
        image.src = PLACEHOLDER_IMAGE;
    };
}


/* =========================================
   JSON VERİLERİNİ YÜKLE
========================================= */

async function loadData() {

    try {

        const responses = await Promise.all([
            fetch(DATA_PATH + "plants.json"),
            fetch(DATA_PATH + "diseases.json"),
            fetch(DATA_PATH + "preparations.json"),
            fetch(DATA_PATH + "categories.json")
        ]);

        if (!responses.every(response => response.ok)) {
            throw new Error("JSON dosyalarından biri yüklenemedi.");
        }

        const data = await Promise.all(
            responses.map(response => response.json())
        );

        plants = data[0];
        diseases = data[1];
        preparations = data[2];
        categories = data[3];

        renderPlants(plants);
        renderDiseases();

        $("#plantCount").textContent = `${plants.length} bitki`;

    } catch (error) {

        console.error("Veri yükleme hatası:", error);

        $("#plantGrid").replaceChildren(
            createElement(
                "p",
                "empty-message",
                "Veriler yüklenemedi. JSON dosyalarını ve yerel sunucu bağlantısını kontrol edin."
            )
        );

        $("#diseaseList").replaceChildren();

    }

}


/* =========================================
   BİTKİ KARTLARI
========================================= */

function createPlantCard(plant) {

    const card = createElement("article", "plant-card");

    card.tabIndex = 0;
    card.setAttribute("role", "button");

    card.setAttribute(
        "aria-label",
        `${plant.common_name} detaylarını görüntüle`
    );

    const image = document.createElement("img");

    image.src = plant.image || PLACEHOLDER_IMAGE;
    image.alt = plant.common_name || "Bitki görseli";

    setImageFallback(image);

    const body = createElement("div", "card-body");

    const category = createElement(
        "span",
        "tag",
        plant.category || "Bitki"
    );

    const title = createElement(
        "h3",
        "",
        plant.common_name
    );

    const scientificName = createElement(
        "div",
        "latin",
        plant.scientific_name
    );

    const description = createElement(
        "p",
        "",
        plant.short_description || plant.description || ""
    );

    body.append(
        category,
        title,
        scientificName,
        description
    );

    card.append(image, body);

    card.addEventListener("click", () => {
        showPlantDetails(plant);
    });

    card.addEventListener("keydown", event => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();

            showPlantDetails(plant);

        }

    });

    return card;

}


/* =========================================
   BİTKİLERİ EKRANA YAZ
========================================= */

function renderPlants(list) {

    const grid = $("#plantGrid");

    grid.replaceChildren();

    if (!list.length) {

        grid.append(
            createElement(
                "p",
                "empty-message",
                "Henüz bitki kaydı bulunmuyor."
            )
        );

        return;

    }

    list.forEach(plant => {

        grid.append(
            createPlantCard(plant)
        );

    });

    $("#plantCount").textContent = `${list.length} bitki`;

}


/* =========================================
   RAHATSIZLIK LİSTESİ
========================================= */

function renderDiseases() {

    const list = $("#diseaseList");

    list.replaceChildren();

    diseases.forEach(disease => {

        const button = createElement(
            "button",
            "topic-item"
        );

        button.type = "button";

        const title = createElement(
            "span",
            "",
            disease.name
        );

        const arrow = createElement(
            "span",
            "",
            "→"
        );

        button.append(title, arrow);

        button.addEventListener("click", () => {
            showDiseaseDetails(disease);
        });

        list.append(button);

    });

}


/* =========================================
   DETAY PENCERESİ YARDIMCILARI
========================================= */

function openDetailDialog() {

    const dialog = $("#detailDialog");

    if (!dialog.open) {
        dialog.showModal();
    }

}

function clearDetailDialog() {

    $("#dialogContent").replaceChildren();

}

function addDetailHeading(parent, title) {

    const heading = createElement(
        "h3",
        "",
        title
    );

    parent.append(heading);

}

function addDetailText(parent, title, content) {

    if (!content) return;

    addDetailHeading(parent, title);

    const paragraph = createElement(
        "p",
        "",
        content
    );

    parent.append(paragraph);

}

function addDetailList(parent, title, items) {

    if (!Array.isArray(items) || !items.length) {
        return;
    }

    addDetailHeading(parent, title);

    const ul = document.createElement("ul");

    items.forEach(item => {

        const value = typeof item === "string"
            ? item
            : item.title || "";

        const li = createElement("li", "", value);

        ul.append(li);

    });

    parent.append(ul);

}


/* =========================================
   KAYNAKÇA
========================================= */

function addBibliography(parent, bibliography) {

    if (!Array.isArray(bibliography) || !bibliography.length) {
        return;
    }

    addDetailHeading(parent, "Kaynakça");

    const list = document.createElement("ul");

    bibliography.forEach(source => {

        const item = createElement(
            "li",
            "",
            source.title
        );

        list.append(item);

    });

    parent.append(list);

}


/* =========================================
   BİTKİ DETAYLARI
========================================= */

function showPlantDetails(plant) {

    const content = $("#dialogContent");

    clearDetailDialog();

    const title = createElement(
        "h2",
        "",
        plant.common_name
    );

    const scientificName = createElement(
        "p",
        "latin",
        plant.scientific_name
    );

    content.append(title, scientificName);

    const image = document.createElement("img");

    image.src = plant.image || PLACEHOLDER_IMAGE;
    image.alt = plant.common_name;

    setImageFallback(image);

    content.append(image);

    addDetailText(
        content,
        "Açıklama",
        plant.description
    );

    addDetailText(
        content,
        "Köken",
        plant.origin
    );

    addDetailList(
        content,
        "Alternatif adlar",
        plant.alternative_names
    );

    addDetailList(
        content,
        "Kullanılan bitki kısımları",
        plant.plant_parts
    );

    addDetailList(
        content,
        "Geleneksel kullanım",
        plant.traditional_uses
    );

    addDetailText(
        content,
        "Bilimsel kanıt ve sınırlılıklar",
        plant.evidence
    );

    addDetailList(
        content,
        "Güvenlik notları",
        plant.safety_notes
    );

    const relatedPreparations = preparations.filter(
        item => item.plant_id === plant.id
    );

    if (relatedPreparations.length) {

        addDetailHeading(
            content,
            "İlişkili hazırlama kayıtları"
        );

        relatedPreparations.forEach(item => {

            const disease = diseases.find(
                disease => disease.id === item.disease_id
            );

            const block = document.createElement("div");

            block.className = "preparation-detail";

            addDetailText(
                block,
                item.title,
                item.intended_use
            );

            if (disease) {

                const related = createElement(
                    "p",
                    "",
                    `İlişkili konu: ${disease.name}`
                );

                block.append(related);

            }

            addDetailText(
                block,
                "Hazırlama yöntemi",
                item.method
            );

            content.append(block);

        });

    }

    addBibliography(
        content,
        plant.bibliography
    );

    openDetailDialog();

}


/* =========================================
   RAHATSIZLIK DETAYLARI
========================================= */

function showDiseaseDetails(disease) {

    const content = $("#dialogContent");

    clearDetailDialog();

    const title = createElement(
        "h2",
        "",
        disease.name
    );

    content.append(title);

    addDetailText(
        content,
        "Açıklama",
        disease.description
    );

    addDetailList(
        content,
        "Belirtiler",
        disease.symptoms
    );

    addDetailList(
        content,
        "Anahtar kelimeler",
        disease.keywords
    );

    const relatedPreparations = preparations.filter(
        item => item.disease_id === disease.id
    );

    if (relatedPreparations.length) {

        addDetailHeading(
            content,
            "İlişkili bitkiler ve hazırlama kayıtları"
        );

        relatedPreparations.forEach(item => {

            const plant = plants.find(
                plant => plant.id === item.plant_id
            );

            const block = document.createElement("div");

            block.className = "preparation-detail";

            const name = createElement(
                "h3",
                "",
                `${plant?.common_name || "Bitki"} — ${item.title}`
            );

            block.append(name);

            addDetailText(
                block,
                "Geleneksel kullanım bilgisi",
                item.intended_use
            );

            addDetailText(
                block,
                "Hazırlama yöntemi",
                item.method
            );

            addDetailText(
                block,
                "Güvenlik notları",
                item.safety_notes
            );

            if (plant) {

                const plantButton = createElement(
                    "button",
                    "text-button",
                    "Bitki ayrıntılarını görüntüle →"
                );

                plantButton.type = "button";

                plantButton.addEventListener("click", () => {
                    showPlantDetails(plant);
                });

                block.append(plantButton);

            }

            content.append(block);

        });

    } else {

        addDetailText(
            content,
            "İlişkili kayıtlar",
            "Bu konu için henüz hazırlama kaydı eklenmemiştir."
        );

    }

    addBibliography(
        content,
        disease.bibliography
    );

    openDetailDialog();

}


/* =========================================
   ARAMA SİSTEMİ
========================================= */

function searchPlants(query) {

    const q = normalizeText(query);

    return plants.filter(plant => {

        const searchable = [

            plant.common_name,
            plant.scientific_name,
            plant.description,
            plant.short_description,
            plant.origin,
            ...(plant.alternative_names || []),
            ...(plant.keywords || [])

        ].join(" ");

        return normalizeText(searchable).includes(q);

    });

}


function searchDiseases(query) {

    const q = normalizeText(query);

    return diseases.filter(disease => {

        const searchable = [

            disease.name,
            disease.description,
            ...(disease.symptoms || []),
            ...(disease.keywords || [])

        ].join(" ");

        return normalizeText(searchable).includes(q);

    });

}


function searchPreparations(query) {

    const q = normalizeText(query);

    return preparations.filter(item => {

        const searchable = [

            item.title,
            item.method,
            item.intended_use,
            item.ingredients,
            item.safety_notes

        ].join(" ");

        return normalizeText(searchable).includes(q);

    });

}


/* =========================================
   ARAMA SONUÇLARI
========================================= */

function renderSearchResults(query) {

    const results = $("#resultsGrid");

    results.replaceChildren();

    const plantResults = searchPlants(query);
    const diseaseResults = searchDiseases(query);
    const preparationResults = searchPreparations(query);

    let total = 0;

    plantResults.forEach(plant => {

        const button = createSearchCard(
            plant.common_name,
            "Bitki",
            plant.scientific_name,
            () => showPlantDetails(plant)
        );

        results.append(button);

        total++;

    });


    diseaseResults.forEach(disease => {

        const button = createSearchCard(
            disease.name,
            "Rahatsızlık",
            disease.description,
            () => showDiseaseDetails(disease)
        );

        results.append(button);

        total++;

    });


    preparationResults.forEach(item => {

        const plant = plants.find(
            p => p.id === item.plant_id
        );

        const disease = diseases.find(
            d => d.id === item.disease_id
        );

        const subtitle = [
            plant?.common_name,
            disease?.name
        ].filter(Boolean).join(" · ");

        const button = createSearchCard(
            item.title,
            "Hazırlama",
            subtitle,
            () => {
                if (disease) {
                    showDiseaseDetails(disease);
                } else if (plant) {
                    showPlantDetails(plant);
                }
            }
        );

        results.append(button);

        total++;

    });

    $("#searchResults").classList.remove("hidden");

    $("#noResults").classList.toggle(
        "hidden",
        total > 0
    );

    $("#searchResults").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


function createSearchCard(title, type, subtitle, callback) {

    const button = createElement(
        "button",
        "topic-item"
    );

    button.type = "button";

    const left = document.createElement("span");

    const name = createElement("strong", "", title);

    const description = createElement(
        "small",
        "",
        ` · ${type} · ${subtitle || ""}`
    );

    left.append(name, description);

    const arrow = createElement(
        "span",
        "",
        "→"
    );

    button.append(left, arrow);

    button.addEventListener("click", callback);

    return button;

}


/* =========================================
   OLAYLAR
========================================= */

$("#searchForm").addEventListener("submit", event => {

    event.preventDefault();

    const query = $("#searchInput").value.trim();

    if (!query) {
        $("#searchInput").focus();
        return;
    }

    renderSearchResults(query);

});


$("#clearSearch").addEventListener("click", () => {

    $("#searchInput").value = "";

    $("#searchResults").classList.add("hidden");

    $("#searchInput").focus();

});


$("#closeDialog").addEventListener("click", () => {

    $("#detailDialog").close();

});


$("#detailDialog").addEventListener("click", event => {

    if (event.target === $("#detailDialog")) {
        $("#detailDialog").close();
    }

});


/* =========================================
   SAYFA BAŞLATMA
========================================= */

$("#currentYear").textContent = new Date().getFullYear();

loadData();
