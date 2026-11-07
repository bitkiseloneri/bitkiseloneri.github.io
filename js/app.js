
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const diseaseList = document.getElementById("diseaseList");
    const noResults = document.getElementById("noResults");
    const diseaseDetail = document.getElementById("diseaseDetail");
    const detailContent = document.getElementById("detailContent");
    const backButton = document.getElementById("backButton");
    const resultsSection = document.getElementById("sonuclar");

    let diseases = [];
    let plants = [];
    let preparations = [];
    let categories = [];

    // Türkçe karakter uyumlu arama
    function normalizeText(value) {
        return String(value || "")
            .toLocaleLowerCase("tr-TR")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i")
            .trim();
    }

    // HTML güvenliği
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    // Kaynak bağlantılarında yalnızca HTTP/HTTPS kabul edilir.
    function safeUrl(value) {
        try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol)
                ? escapeHTML(url.href)
                : "";
        } catch {
            return "";
        }
    }

    // Verileri yükle
    async function loadData() {
        try {
            const paths = [
                "data/diseases.json",
                "data/plants.json",
                "data/preparations.json",
                "data/categories.json"
            ];

            const responses = await Promise.all(
                paths.map(path => fetch(path))
            );

            if (responses.some(response => !response.ok)) {
                throw new Error("JSON dosyaları yüklenemedi.");
            }

            const data = await Promise.all(
                responses.map(response => response.json())
            );

            [diseases, plants, preparations, categories] = data;

            renderDiseases(diseases);

        } catch (error) {
            console.error(error);

            diseaseList.innerHTML = `
                <p class="loading-message">
                    Veriler yüklenemedi. Dosya yollarını ve JSON biçimini kontrol edin.
                </p>
            `;
        }
    }

    // Kategori adı
    function getCategoryName(categoryId) {
        const category = categories.find(item =>
            String(item.id) === String(categoryId)
        );

        return category?.name || "Genel";
    }

    // Hastalık kartları
    function renderDiseases(items) {
        diseaseList.innerHTML = "";
        noResults.classList.toggle("hidden", items.length > 0);

        items.forEach(disease => {
            const card = document.createElement("article");

            card.className = "disease-card";
            card.tabIndex = 0;
            card.setAttribute("role", "button");

            card.innerHTML = `
                <span class="card-category">
                    ${escapeHTML(getCategoryName(disease.categoryId))}
                </span>

                <h3>${escapeHTML(disease.name)}</h3>

                <p>${escapeHTML(disease.description)}</p>

                <span class="card-link">
                    Bitkileri ve tarifleri incele →
                </span>
            `;

            card.addEventListener("click", () => {
                showDiseaseDetail(disease.id);
            });

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    showDiseaseDetail(disease.id);
                }
            });

            diseaseList.appendChild(card);
        });
    }

    // Arama
    function searchDiseases() {
        const query = normalizeText(searchInput.value);

        diseaseDetail.classList.add("hidden");
        resultsSection.classList.remove("hidden");

        if (!query) {
            renderDiseases(diseases);
            return;
        }

        const results = diseases.filter(disease => {
            const content = normalizeText([
                disease.name,
                disease.description,
                ...(disease.keywords || []),
                getCategoryName(disease.categoryId)
            ].join(" "));

            return content.includes(query);
        });

        renderDiseases(results);
        resultsSection.scrollIntoView({ behavior: "smooth" });
    }

    // Hastalığa bağlı tarifleri bul
    function getDiseasePreparations(diseaseId) {
        return preparations.filter(item =>
            String(item.diseaseId) === String(diseaseId)
        );
    }

    // Bitki kartı
    function createPlantCard(plant) {
        const imagePath = plant.image
            ? escapeHTML(plant.image)
            : "";

        return `
            <article class="plant-card">
                ${
                    imagePath
                        ? `
                            <img
                                class="plant-image"
                                src="${imagePath}"
                                alt="${escapeHTML(plant.name)}"
                                loading="lazy"
                                onerror="this.style.display='none'"
                            >
                        `
                        : ""
                }

                <div class="plant-card-content">
                    <h3>${escapeHTML(plant.name)}</h3>

                    ${
                        plant.scientificName
                            ? `
                                <p class="scientific-name">
                                    ${escapeHTML(plant.scientificName)}
                                </p>
                            `
                            : ""
                    }

                    <p>${escapeHTML(plant.description || "")}</p>
                </div>
            </article>
        `;
    }

    // Tarif kartı
    function createPreparationCard(preparation, index) {
        const ingredients = preparation.ingredients || [];
        const warnings = preparation.warnings || [];
        const steps = preparation.steps || [];
        const sources = preparation.sources || [];

        const ingredientHTML = ingredients.map(ingredient => {
            const plant = plants.find(item =>
                String(item.id) === String(ingredient.plantId)
            );

            const name = plant?.name || ingredient.name || "Bilinmeyen bitki";

            return `
                <li>
                    <strong>${escapeHTML(name)}</strong>
                    ${
                        ingredient.amount
                            ? ` — ${escapeHTML(ingredient.amount)}`
                            : ""
                    }
                </li>
            `;
        }).join("");

        const stepHTML = steps.length
            ? `
                <ol class="preparation-steps">
                    ${steps.map(step => `<li>${escapeHTML(step)}</li>`).join("")}
                </ol>
            `
            : `
                <p class="empty-information">
                    Hazırlama aşamaları henüz doğrulanarak eklenmemiştir.
                </p>
            `;

        const warningHTML = warnings.length
            ? `
                <ul>
                    ${warnings.map(warning => `<li>${escapeHTML(warning)}</li>`).join("")}
                </ul>
            `
            : `<p>Bu tarif için özel güvenlik bilgileri henüz eklenmemiştir.</p>`;

        const sourceHTML = sources.length
            ? `
                <ul class="source-list">
                    ${sources.map(source => {
                        const url = safeUrl(source.url);

                        return `
                            <li>
                                ${
                                    url
                                        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">
                                            ${escapeHTML(source.title)}
                                           </a>`
                                        : escapeHTML(source.title || "Kaynak")
                                }
                            </li>
                        `;
                    }).join("")}
                </ul>
            `
            : `<p>Bu tarif için henüz kaynak eklenmemiştir.</p>`;

        return `
            <article class="recipe-card">

                <div class="recipe-header">
                    <span class="recipe-number">TARİF ${index + 1}</span>

                    <span class="recipe-type">
                        ${escapeHTML(preparation.type || "Bitkisel kullanım")}
                    </span>
                </div>

                <h3>${escapeHTML(preparation.title)}</h3>

                <div class="recipe-section">
                    <h4>🌿 Gerekli bitkiler</h4>
                    <ul class="ingredient-list">
                        ${ingredientHTML || "<li>Malzeme eklenmemiş.</li>"}
                    </ul>
                </div>

                <div class="recipe-section">
                    <h4>🫖 Hazırlanışı</h4>
                    ${stepHTML}
                    ${
                        preparation.method
                            ? `<p>${escapeHTML(preparation.method)}</p>`
                            : ""
                    }
                </div>

                ${
                    preparation.traditionalUse
                        ? `
                            <div class="recipe-section">
                                <h4>Geleneksel kullanım</h4>
                                <p>${escapeHTML(preparation.traditionalUse)}</p>
                            </div>
                        `
                        : ""
                }

                ${
                    preparation.quantity || preparation.frequency
                        ? `
                            <div class="recipe-section">
                                <h4>Kullanım bilgileri</h4>
                                ${
                                    preparation.quantity
                                        ? `<p><strong>Miktar:</strong> ${escapeHTML(preparation.quantity)}</p>`
                                        : ""
                                }
                                ${
                                    preparation.frequency
                                        ? `<p><strong>Sıklık:</strong> ${escapeHTML(preparation.frequency)}</p>`
                                        : ""
                                }
                            </div>
                        `
                        : ""
                }

                <div class="recipe-section">
                    <h4>Bilimsel kanıt durumu</h4>
                    <p>${escapeHTML(
                        preparation.evidence || "Bu tarif için bilimsel kanıt bilgisi henüz değerlendirilmemiştir."
                    )}</p>
                </div>

                <div class="recipe-section warning-box">
                    <h4>⚠ Güvenlik uyarıları</h4>
                    ${warningHTML}
                </div>

                <div class="recipe-section">
                    <h4>Kaynaklar</h4>
                    ${sourceHTML}
                </div>

                ${
                    preparation.verified === true
                        ? `<span class="verification-label">Kaynak kontrolü yapılmış</span>`
                        : `<span class="unverified-label">Bilgiler henüz doğrulanmadı</span>`
                }

            </article>
        `;
    }

    // Hastalık detay sayfası
    function showDiseaseDetail(diseaseId) {
        const disease = diseases.find(item =>
            String(item.id) === String(diseaseId)
        );

        if (!disease) return;

        const relatedPreparations = getDiseasePreparations(diseaseId);

        // Tariflerdeki bitkileri tekilleştir.
        const relatedPlantIds = [
            ...new Set(
                relatedPreparations.flatMap(item =>
                    (item.plantIds || []).map(String)
                )
            )
        ];

        const relatedPlants = relatedPlantIds
            .map(id => plants.find(plant => String(plant.id) === id))
            .filter(Boolean);

        const plantHTML = relatedPlants.length
            ? `
                <div class="plant-list">
                    ${relatedPlants.map(createPlantCard).join("")}
                </div>
            `
            : `
                <p class="empty-information">
                    Bu şikâyetle ilişkilendirilmiş bitki bilgisi henüz bulunmuyor.
                </p>
            `;

        const preparationHTML = relatedPreparations.length
            ? relatedPreparations.map(createPreparationCard).join("")
            : `
                <p class="empty-information">
                    Bu şikâyet için henüz tarif eklenmemiş.
                </p>
            `;

        detailContent.innerHTML = `
            <div class="detail-header">
                <span class="section-label">
                    ${escapeHTML(getCategoryName(disease.categoryId))}
                </span>

                <h2>${escapeHTML(disease.name)}</h2>

                <p>${escapeHTML(disease.description)}</p>
            </div>

            <section class="detail-block">
                <h3 class="detail-subheading">
                    Bu şikâyetle ilişkilendirilen bitkiler
                </h3>

                <p class="block-description">
                    Aşağıdaki bitkiler hakkında geleneksel kullanım
                    bilgileri sunulmaktadır. Listelenmeleri, bu bitkilerin
                    şikâyeti tedavi ettiği anlamına gelmez.
                </p>

                ${plantHTML}
            </section>

            <section class="detail-block">
                <h3 class="detail-subheading">
                    Hazırlama yöntemleri ve alternatifler
                </h3>

                <p class="block-description">
                    Her tarif kendi malzemeleri, hazırlanışı ve güvenlik
                    bilgileriyle ayrı olarak gösterilir.
                </p>

                <div class="recipe-list">
                    ${preparationHTML}
                </div>
            </section>

            <div class="info-box warning-box">
                <h3>Önemli sağlık uyarısı</h3>

                <p>
                    Bitkisel ürünler yan etkilere neden olabilir ve
                    ilaçlarla etkileşebilir. Hamilelik, emzirme,
                    kronik hastalık veya düzenli ilaç kullanımı
                    durumunda sağlık uzmanına danışılmalıdır.
                    Bu içerikler tanı veya tedavi önerisi değildir.
                </p>
            </div>
        `;

        resultsSection.classList.add("hidden");
        diseaseDetail.classList.remove("hidden");

        diseaseDetail.scrollIntoView({ behavior: "smooth" });
    }

    // Listeye geri dön
    function goBack() {
        diseaseDetail.classList.add("hidden");
        resultsSection.classList.remove("hidden");

        resultsSection.scrollIntoView({ behavior: "smooth" });
    }

    searchButton.addEventListener("click", searchDiseases);

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchDiseases();
        }
    });

    searchInput.addEventListener("input", () => {
        if (!searchInput.value.trim()) {
            renderDiseases(diseases);
        }
    });

    backButton.addEventListener("click", goBack);

    loadData();
});
