
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");
const resultCount = document.getElementById("resultCount");

let diseases = [];
let plants = [];
let preparations = [];

// Türkçe karakterleri dikkate alarak arama yapar.
function normalizeText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// JSON dosyalarını yükle.
async function loadData() {
    try {
        const [diseaseResponse, plantResponse, preparationResponse] =
            await Promise.all([
                fetch("./data/diseases.json"),
                fetch("./data/plants.json"),
                fetch("./data/preparations.json")
            ]);

        if (
            !diseaseResponse.ok ||
            !plantResponse.ok ||
            !preparationResponse.ok
        ) {
            throw new Error("Veri dosyaları yüklenemedi.");
        }

        [diseases, plants, preparations] = await Promise.all([
            diseaseResponse.json(),
            plantResponse.json(),
            preparationResponse.json()
        ]);

        resultsContainer.replaceChildren();

        const message = document.createElement("p");
        message.className = "message";
        message.textContent =
            "Veriler hazır. Bir belirti veya bitki adı arayabilirsiniz.";

        resultsContainer.appendChild(message);
    } catch (error) {
        console.error(error);

        showMessage(
            "Veriler yüklenemedi. JSON dosyalarını ve yerel sunucu ayarlarını kontrol edin."
        );
    }
}

function showMessage(text) {
    resultsContainer.replaceChildren();

    const message = document.createElement("p");
    message.className = "message";
    message.textContent = text;

    resultsContainer.appendChild(message);
    resultCount.textContent = "";
}

// ID ile ilişkili bitkiyi bul.
function getPlant(plantId) {
    return plants.find(plant => plant.plant_id === plantId);
}

// Bitkinin hazırlama kayıtlarını ID ile bul.
function getPreparations(plant) {
    return (plant.preparation_ids ?? [])
        .map(id =>
            preparations.find(item => item.preparation_id === id)
        )
        .filter(Boolean);
}

// Güvenli şekilde metin elemanı oluştur.
function addText(parent, tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text ?? "";

    if (className) {
        element.className = className;
    }

    parent.appendChild(element);
    return element;
}

// Liste oluştur.
function addList(parent, title, items) {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    addText(parent, "h4", title);

    const list = document.createElement("ul");

    items.forEach(item => {
        const li = document.createElement("li");

        li.textContent =
            typeof item === "string"
                ? item
                : `${item.name}: ${item.amount}`;

        list.appendChild(li);
    });

    parent.appendChild(list);
}

// Hazırlama kartı.
function renderPreparation(parent, preparation) {
    const card = document.createElement("div");
    card.className = "plant-card";

    addText(card, "span", preparation.method_name, "tag");
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

    parent.appendChild(card);
}

// Bitki kartı.
function renderPlant(parent, plant) {
    const card = document.createElement("div");
    card.className = "plant-card";

    addText(card, "span", "Bitkisel bilgi", "tag");
    addText(card, "h4", plant.common_name);
    addText(card, "p", `Bilimsel adı: ${plant.scientific_name}`);
    addText(card, "p", plant.description);

    addList(card, "Kullanılan bitki bölümleri", plant.plant_parts);
    addList(card, "Güvenlik uyarıları", plant.safety_notes);

    const methods = getPreparations(plant);

    if (methods.length > 0) {
        addText(card, "h4", "Hazırlama yöntemleri");

        methods.forEach(method => {
            renderPreparation(card, method);
        });
    }

    parent.appendChild(card);
}

// Hastalık/bitki sonuç kartı.
function renderDisease(disease) {
    const card = document.createElement("article");
    card.className = "result-card";

    addText(card, "span", disease.category, "tag");
    addText(card, "h3", disease.name);
    addText(card, "p", disease.description);

    addList(card, "Belirtiler", disease.symptoms);

    const relatedPlants = (disease.plant_ids ?? [])
        .map(getPlant)
        .filter(Boolean);

    if (relatedPlants.length > 0) {
        addText(card, "h4", "İlişkili bitkiler");

        relatedPlants.forEach(plant => {
            renderPlant(card, plant);
        });
    } else {
        addText(
            card,
            "p",
            "Bu kayıt için henüz ilişkili bitki bilgisi bulunmuyor."
        );
    }

    if (disease.medical_warning) {
        addText(
            card,
            "p",
            `Sağlık uyarısı: ${disease.medical_warning}`,
            "warning"
        );
    }

    resultsContainer.appendChild(card);
}

// Hem hastalık hem bitki adına göre arama.
function searchData(query) {
    const term = normalizeText(query);

    if (!term) {
        showMessage("Lütfen aramak istediğiniz ifadeyi yazın.");
        return;
    }

    resultsContainer.replaceChildren();

    const matchingDiseases = diseases.filter(disease => {
        const searchableText = [
            disease.name,
            disease.description,
            ...(disease.symptoms ?? [])
        ].join(" ");

        return normalizeText(searchableText).includes(term);
    });

    const matchingPlants = plants.filter(plant => {
        const searchableText = [
            plant.common_name,
            plant.scientific_name,
            plant.description,
            ...(plant.plant_parts ?? [])
        ].join(" ");

        return normalizeText(searchableText).includes(term);
    });

    const shownPlantIds = new Set();

    matchingDiseases.forEach(disease => {
        renderDisease(disease);

        (disease.plant_ids ?? []).forEach(id => {
            shownPlantIds.add(id);
        });
    });

    const extraPlants = matchingPlants.filter(
        plant => !shownPlantIds.has(plant.plant_id)
    );

    extraPlants.forEach(plant => {
        const card = document.createElement("article");
        card.className = "result-card";

        renderPlant(card, plant);
        resultsContainer.appendChild(card);
    });

    const total = matchingDiseases.length + extraPlants.length;
    resultCount.textContent = `${total} sonuç`;

    if (total === 0) {
        showMessage(
            "Eşleşen bir kayıt bulunamadı. Farklı bir kelime deneyin."
        );
    }
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchData(searchInput.value);
});

loadData();
