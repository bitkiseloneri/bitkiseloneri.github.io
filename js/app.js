
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

    // Türkçe karakterleri arama için standartlaştırır.
    function normalizeText(value) {
        return String(value || "")
            .toLocaleLowerCase("tr-TR")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i")
            .trim();
    }

    // HTML içeriklerinde güvenli metin gösterimi.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    // JSON dosyalarını yükler.
    async function loadData() {
        try {
            const files = await Promise.all([
                fetch("data/diseases.json"),
                fetch("data/plants.json"),
                fetch("data/preparations.json"),
                fetch("data/categories.json")
            ]);

            if (files.some(response => !response.ok)) {
                throw new Error("Veri dosyalarından biri yüklenemedi.");
            }

            const data = await Promise.all(
                files.map(response => response.json())
            );

            diseases = Array.isArray(data[0]) ? data[0] : [];
            plants = Array.isArray(data[1]) ? data[1] : [];
            preparations = Array.isArray(data[2]) ? data[2] : [];
            categories = Array.isArray(data[3]) ? data[3] : [];

            renderDiseases(diseases);

        } catch (error) {
            console.error("Veri yükleme hatası:", error);

            diseaseList.innerHTML = `
                <p class="loading-message">
                    Bilgiler yüklenemedi. Lütfen sayfayı yenileyin.
                </p>
            `;
        }
    }

    // Kategori adını bulur.
    function getCategoryName(categoryId) {
        const category = categories.find(item =>
            String(item.id) === String(categoryId)
        );

        return category ? category.name : "Genel";
    }

    // Şikâyet kartlarını oluşturur.
    function renderDiseases(items) {
        diseaseList.innerHTML = "";
        noResults.classList.add("hidden");

        if (items.length === 0) {
            noResults.classList.remove("hidden");
            return;
        }

        items.forEach(disease => {
            const card = document.createElement("article");
            card.className = "disease-card";
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute(
                "aria-label",
                `${disease.name} detaylarını görüntüle`
            );

            card.innerHTML = `
                <span class="card-category">
                    ${escapeHTML(getCategoryName(disease.categoryId))}
                </span>

                <h3>${escapeHTML(disease.name)}</h3>

                <p>${escapeHTML(disease.description)}</p>

                <span class="card-link">
                    Bitkileri incele →
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

    // Arama işlemi.
    function searchDiseases() {
        const query = normalizeText(searchInput.value);

        if (!query) {
            renderDiseases(diseases);
            return;
        }

        const results = diseases.filter(disease => {
            const searchableText = normalizeText([
                disease.name,
                disease.description,
                ...(disease.keywords || []),
                getCategoryName(disease.categoryId)
            ].join(" "));

            return searchableText.includes(query);
        });

        renderDiseases(results);
        resultsSection.scrollIntoView({ behavior: "smooth" });
    }

    // Bir şikâyete bağlı bitkileri ve hazırlanışları gösterir.
    function showDiseaseDetail(diseaseId) {
        const disease = diseases.find(item =>
            String(item.id) === String(diseaseId)
        );

        if (!disease) return;

        const relatedPreparations = preparations.filter(item =>
            String(item.diseaseId) === String(diseaseId)
        );

        const plantCards = relatedPreparations.map(preparation => {
            const plant = plants.find(item =>
                String(item.id) === String(preparation.plantId)
            );

            if (!plant) return "";

            return `
                <article class="plant-card">
                    <h3>${escapeHTML(plant.name)}</h3>

                    ${plant.scientificName ? `
                        <p>
                            <strong>Bilimsel adı:</strong>
                            <em>${escapeHTML(plant.scientificName)}</em>
                        </p>
                    ` : ""}

                    <p>
                        <strong>Geleneksel kullanım:</strong>
                        ${escapeHTML(preparation.traditionalUse || "Bilgi eklenmemiş.")}
                    </p>

                    <div class="preparation-box">
                        <h4>Hazırlanış yöntemi</h4>
                        <p>${escapeHTML(preparation.method || "Bilgi eklenmemiş.")}</p>
                    </div>

                    ${preparation.quantity ? `
                        <p>
                            <strong>Miktar bilgisi:</strong>
                            ${escapeHTML(preparation.quantity)}
                        </p>
                    ` : ""}

                    ${preparation.frequency ? `
                        <p>
                            <strong>Kullanım sıklığı:</strong>
                            ${escapeHTML(preparation.frequency)}
                        </p>
                    ` : ""}

                    ${preparation.evidence ? `
                        <div class="info-box">
                            <h4>Bilimsel kanıt durumu</h4>
                            <p>${escapeHTML(preparation.evidence)}</p>
                        </div>
                    ` : ""}

                    ${preparation.warnings ? `
                        <div class="info-box warning-box">
                            <h4>Güvenlik uyarıları</h4>
                            <p>${escapeHTML(preparation.warnings)}</p>
                        </div>
                    ` : ""}
                </article>
            `;
        }).filter(Boolean).join("");

        const sources = [
            ...(disease.sources || []),
            ...relatedPreparations.flatMap(item => item.sources || [])
        ];

        const uniqueSources = [
            ...new Map(
                sources.map(source => [source.title + source.url, source])
            ).values()
        ];

        detailContent.innerHTML = `
            <div class="detail-header">
                <span class="section-label">
                    ${escapeHTML(getCategoryName(disease.categoryId))}
                </span>

                <h2>${escapeHTML(disease.name)}</h2>

                <p>${escapeHTML(disease.description)}</p>
            </div>

            <h3 class="detail-subheading">
                İlişkilendirilen bitkiler
            </h3>

            ${
                plantCards
                    ? `<div class="plant-list">${plantCards}</div>`
                    : `<p class="no-results">
                        Bu şikâyet için henüz bitki bilgisi eklenmemiş.
                    </p>`
            }

            <div class="info-box warning-box">
                <h3>Önemli sağlık uyarısı</h3>
                <p>
                    Buradaki bilgiler geleneksel bitkisel kullanımları
                    tanıtır; hastalıkları teşhis veya tedavi etmez.
                    Bitkisel ürünler yan etkilere neden olabilir ve
                    ilaçlarla etkileşebilir. Özellikle düzenli ilaç
                    kullanıyorsanız, hamileyseniz, emziriyorsanız veya
                    kronik bir rahatsızlığınız varsa sağlık uzmanına
                    danışmadan kullanmayınız.
                </p>
            </div>

            ${
                uniqueSources.length
                    ? `
                        <h3 class="detail-subheading">Kaynaklar</h3>
                        <div class="info-box">
                            <ul class="source-list">
                                ${uniqueSources.map(source => `
                                    <li>
                                        ${
                                            source.url
                                                ? `<a href="${escapeHTML(source.url)}"
                                                     target="_blank"
                                                     rel="noopener noreferrer">
                                                     ${escapeHTML(source.title)}
                                                   </a>`
                                                : escapeHTML(source.title)
                                        }
                                    </li>
                                `).join("")}
                            </ul>
                        </div>
                    `
                    : `
                        <div class="info-box">
                            <h3>Kaynak bilgisi</h3>
                            <p>
                                Bu içerik için henüz doğrulanmış kaynak
                                eklenmemiştir.
                            </p>
                        </div>
                    `
            }
        `;

        resultsSection.classList.add("hidden");
        diseaseDetail.classList.remove("hidden");

        diseaseDetail.scrollIntoView({ behavior: "smooth" });
    }

    // Listeye geri dön.
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
