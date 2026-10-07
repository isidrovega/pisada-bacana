"use strict";

/* =====================================================
   PISADA BACANA
   NOTA DE SERVICIO
   PDF + COMPARTIR
===================================================== */

(() => {

    let currentNoteOrder = null;
    let currentNoteSettings = null;
    let isGeneratingPDF = false;


    /* =================================================
       FIRESTORE
    ================================================= */

    function getDatabase() {
        if (!window.PisadaBacanaDB) {
            throw new Error(
                "Firebase todavía no está listo."
            );
        }

        return window.PisadaBacanaDB;
    }


    /* =================================================
       UTILIDADES
    ================================================= */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatMoneyNumber(value) {
        return new Intl.NumberFormat(
            "es-MX",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(
            Number(value) || 0
        );
    }


    function formatMoney(
        value,
        currency = "MXN"
    ) {
        return `${currency}${formatMoneyNumber(value)}`;
    }


    function formatNoteDate(value) {
        if (!value) {
            return "Sin fecha";
        }

        let date;

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                String(value)
            )
        ) {
            const [
                year,
                month,
                day
            ] = String(value)
                .split("-")
                .map(Number);

            date = new Date(
                year,
                month - 1,
                day
            );
        } else {
            date = new Date(value);
        }

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Sin fecha";
        }

        return new Intl.DateTimeFormat(
            "es-MX",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        )
            .format(date)
            .replace(".", "");
    }


    function sanitizeFileName(value) {
        return String(
            value || "nota"
        )
            .trim()
            .replace(
                /[^a-zA-Z0-9-_]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            );
    }


    function firstValue(
        object,
        keys,
        fallback = ""
    ) {
        for (const key of keys) {
            if (
                object &&
                object[key] !== undefined &&
                object[key] !== null &&
                String(object[key]).trim() !== ""
            ) {
                return object[key];
            }
        }

        return fallback;
    }


    /* =================================================
       PEDIDO
    ================================================= */

    async function findOrder(orderId) {
        const value =
            String(orderId || "")
                .trim();

        if (!value) {
            return null;
        }

        const database =
            getDatabase();

        try {
            const directOrder =
                await database.getOrder(
                    value
                );

            if (directOrder) {
                return directOrder;
            }
        } catch (error) {
            console.warn(
                "No se encontró el pedido directamente:",
                error
            );
        }

        const orders =
            await database.getOrders();

        return (
            orders.find(
                order =>
                    String(order.id) ===
                    value
            ) ||
            orders.find(
                order =>
                    String(order.code) ===
                    value
            ) ||
            null
        );
    }


    function getOrderItems(order) {
        if (
            Array.isArray(order.items) &&
            order.items.length
        ) {
            return order.items.map(
                item => ({
                    itemType:
                        item.itemType ||
                        "Artículo",

                    brand:
                        item.brand || "",

                    model:
                        item.model || "",

                    color:
                        item.color || "",

                    service:
                        item.service ||
                        "Servicio",

                    price:
                        Math.max(
                            Number(
                                item.price || 0
                            ),
                            0
                        )
                })
            );
        }

        return [{
            itemType:
                order.itemType ||
                "Artículo",

            brand:
                order.brand || "",

            model:
                order.model || "",

            color:
                order.color || "",

            service:
                order.service ||
                "Servicio",

            price:
                Math.max(
                    Number(
                        order.price || 0
                    ),
                    0
                )
        }];
    }


    function getOrderTotal(order) {
        if (
            Number.isFinite(
                Number(order.total)
            )
        ) {
            return Math.max(
                Number(order.total),
                0
            );
        }

        if (
            Array.isArray(order.items) &&
            order.items.length
        ) {
            return order.items.reduce(
                (total, item) =>
                    total +
                    Math.max(
                        Number(
                            item.price || 0
                        ),
                        0
                    ),
                0
            );
        }

        return Math.max(
            Number(
                order.price || 0
            ),
            0
        );
    }


    function getPaidAmount(order) {
        if (
            Array.isArray(order.payments)
        ) {
            return order.payments.reduce(
                (total, payment) =>
                    total +
                    Math.max(
                        Number(
                            payment.amount || 0
                        ),
                        0
                    ),
                0
            );
        }

        return Math.max(
            Number(
                order.paid ??
                order.advance ??
                0
            ),
            0
        );
    }


    /* =================================================
       NEGOCIO
    ================================================= */

    function getBusinessData(
        settings = {}
    ) {
        const business =
            settings.business ||
            settings.company ||
            settings.negocio ||
            settings.businessInfo ||
            settings;

        return {
            name:
                firstValue(
                    business,
                    [
                        "name",
                        "businessName",
                        "companyName",
                        "nombre",
                        "nombreNegocio"
                    ],
                    "Pisada Bacana Sneaker Cleaning"
                ),

            address:
                firstValue(
                    business,
                    [
                        "address",
                        "street",
                        "direccion",
                        "businessAddress"
                    ],
                    ""
                ),

            address2:
                firstValue(
                    business,
                    [
                        "address2",
                        "neighborhood",
                        "colonia"
                    ],
                    ""
                ),

            city:
                firstValue(
                    business,
                    [
                        "city",
                        "ciudad"
                    ],
                    ""
                ),

            country:
                firstValue(
                    business,
                    [
                        "country",
                        "pais"
                    ],
                    ""
                ),

            phone:
                firstValue(
                    business,
                    [
                        "phone",
                        "telefono",
                        "businessPhone"
                    ],
                    ""
                ),

            email:
                firstValue(
                    business,
                    [
                        "email",
                        "correo",
                        "businessEmail"
                    ],
                    ""
                ),

            instagram:
                firstValue(
                    business,
                    [
                        "instagram",
                        "businessInstagram",
                        "social",
                        "redSocial"
                    ],
                    ""
                ),

            message:
                firstValue(
                    business,
                    [
                        "message",
                        "mensaje",
                        "businessMessage"
                    ],
                    "Gracias por su confianza."
                ),

            logo:
                firstValue(
                    business,
                    [
                        "logo",
                        "logoUrl",
                        "logoData",
                        "businessLogo"
                    ],
                    "img/logo-pisada-bacana.png"
                )
        };
    }


    function getTerms(
        settings = {}
    ) {
        if (
            Array.isArray(settings.terms) &&
            settings.terms.length
        ) {
            return settings.terms
                .map(String)
                .filter(Boolean);
        }

        if (
            Array.isArray(
                settings.business?.terms
            ) &&
            settings.business.terms.length
        ) {
            return settings.business.terms
                .map(String)
                .filter(Boolean);
        }

        return [
            "Recepción: Todo calzado o gorra se recibe bajo revisión previa. Los detalles de desgaste, manchas fijas o daños previos se anotan en este comprobante.",
            "Calzado o prendas olvidadas: Pasados 30 días a partir de la fecha estimada de entrega, no nos hacemos responsables por el deterioro, pérdida o resguardo de las prendas.",
            "Resultados: Hacemos nuestro mejor esfuerzo por eliminar manchas y suciedad, pero el resultado final depende del material, antigüedad y condición previa del artículo.",
            "Garantía: Tienes 48 horas a partir de la entrega para señalar cualquier disconformidad con el servicio realizado."
        ];
    }


    function buildItemDescription(item) {
        const parts = [
            item.brand,
            item.model,
            item.color,
            item.itemType
        ]
            .map(
                value =>
                    String(value || "")
                        .trim()
            )
            .filter(Boolean);

        return parts.join(" ");
    }


    /* =================================================
       MODAL
    ================================================= */

    function ensureNoteModal() {
        let modal =
            document.getElementById(
                "serviceNoteModal"
            );

        if (modal) {
            return modal;
        }

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "serviceNoteModal";

        modal.className =
            "note-modal";

        modal.innerHTML = `
            <div class="note-toolbar">

                <div class="note-toolbar-title">
                    <span>
                        NOTA DE SERVICIO
                    </span>

                    <strong id="noteToolbarCode">
                        Nota
                    </strong>
                </div>

                <div class="note-toolbar-actions">

                    <button
                        type="button"
                        class="note-toolbar-button primary"
                        id="shareServiceNoteButton"
                    >
                        Enviar PDF por WhatsApp
                    </button>

                    <button
                        type="button"
                        class="note-toolbar-close"
                        id="closeServiceNoteButton"
                        aria-label="Cerrar nota"
                    >
                        ×
                    </button>

                </div>

            </div>

            <div class="note-preview-area">

                <article
                    class="service-note"
                    id="serviceNote"
                ></article>

            </div>
        `;

        document.body.appendChild(
            modal
        );

        document
            .getElementById(
                "closeServiceNoteButton"
            )
            .addEventListener(
                "click",
                closeServiceNote
            );

        document
            .getElementById(
                "shareServiceNoteButton"
            )
            .addEventListener(
                "click",
                shareServiceNotePDF
            );

        return modal;
    }


    /* =================================================
       RENDER
    ================================================= */

    function renderServiceNote(
        order,
        settings = {}
    ) {
        const note =
            document.getElementById(
                "serviceNote"
            );

        if (!note) {
            return;
        }

        const business =
            getBusinessData(
                settings
            );

        const terms =
            getTerms(
                settings
            );

        const currency =
            settings.orders?.currency ||
            settings.currency ||
            "MXN";

        const items =
            getOrderItems(
                order
            );

        const total =
            getOrderTotal(
                order
            );

        const paid =
            Math.min(
                getPaidAmount(order),
                total
            );

        const balance =
            Math.max(
                total - paid,
                0
            );

        const logoHTML = `
            <img
                src="${escapeHTML(
                    business.logo
                )}"
                alt="${escapeHTML(
                    business.name
                )}"
                crossorigin="anonymous"
                onerror="
                    this.style.display='none';
                    this.nextElementSibling.style.display='flex';
                "
            >

            <div
                class="note-company-logo-fallback"
                style="display:none;"
            >
                PB
            </div>
        `;

        const itemsHTML =
            items
                .map(
                    (item, index) => {

                        const description =
                            buildItemDescription(
                                item
                            );

                        return `
                            <tr>

                                <td>
                                    ${index + 1}
                                </td>

                                <td>

                                    <span
                                        class="note-item-service"
                                    >
                                        ${escapeHTML(
                                            item.service
                                        )}
                                    </span>

                                    <span
                                        class="note-item-description"
                                    >
                                        ${escapeHTML(
                                            description ||
                                            item.itemType
                                        )}
                                    </span>

                                </td>

                                <td>
                                    1.00
                                </td>

                                <td>
                                    ${formatMoneyNumber(
                                        item.price
                                    )}
                                </td>

                                <td>
                                    ${formatMoneyNumber(
                                        item.price
                                    )}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");

        const termsHTML =
            terms
                .map(
                    term => `
                        <li>
                            ${escapeHTML(term)}
                        </li>
                    `
                )
                .join("");

        const notesText =
            String(
                order.notes || ""
            ).trim();

        note.innerHTML = `

            <header class="note-header">

                <div class="note-company-block">

                    <div class="note-company-logo">
                        ${logoHTML}
                    </div>

                    <div class="note-company-name">
                        ${escapeHTML(
                            business.name
                        )}
                    </div>

                    <div class="note-company-info">

                        ${
                            business.address
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.address
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            business.address2
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.address2
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            business.city
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.city
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            business.country
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.country
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            business.phone
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.phone
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            business.email
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.email
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            business.instagram
                                ? `
                                    <span>
                                        ${escapeHTML(
                                            business.instagram
                                        )}
                                    </span>
                                `
                                : ""
                        }

                    </div>

                </div>


                <div class="note-document-info">

                    <h1>
                        NOTA DE SERVICIO
                    </h1>

                    <div class="note-document-code">
                        # ${escapeHTML(
                            order.code ||
                            "Sin folio"
                        )}
                    </div>

                    <div class="note-balance-label">
                        Saldo adeudado
                    </div>

                    <div class="note-balance-value">
                        ${formatMoney(
                            balance,
                            currency
                        )}
                    </div>

                </div>

            </header>


            <section class="note-meta-section">

                <div class="note-client">

                    <div class="note-client-label">
                        Facturar a
                    </div>

                    <div class="note-client-name">
                        ${escapeHTML(
                            order.clientName ||
                            "Sin cliente"
                        )}
                    </div>

                    ${
                        order.phone
                            ? `
                                <div class="note-client-phone">
                                    ${escapeHTML(
                                        order.phone
                                    )}
                                </div>
                            `
                            : ""
                    }

                </div>


                <div class="note-dates">

                    <div class="note-date-row">
                        <span>
                            Fecha de recepción :
                        </span>

                        <strong>
                            ${escapeHTML(
                                formatNoteDate(
                                    order.createdAt
                                )
                            )}
                        </strong>
                    </div>

                    <div class="note-date-row">
                        <span>
                            Estado :
                        </span>

                        <strong>
                            ${escapeHTML(
                                order.status ||
                                "Recibido"
                            )}
                        </strong>
                    </div>

                    <div class="note-date-row">
                        <span>
                            Fecha de entrega :
                        </span>

                        <strong>
                            ${escapeHTML(
                                formatNoteDate(
                                    order.deliveryDate
                                )
                            )}
                        </strong>
                    </div>

                </div>

            </section>


            <table class="note-table">

                <thead>
                    <tr>
                        <th>#</th>
                        <th>
                            Artículo & Descripción
                        </th>
                        <th>Cant.</th>
                        <th>Tarifa</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>

                <tbody>
                    ${itemsHTML}
                </tbody>

            </table>


            <div class="note-totals-wrapper">

                <div class="note-totals">

                    <div class="note-total-row">
                        <span>
                            Subtotal
                        </span>

                        <span>
                            ${formatMoneyNumber(
                                total
                            )}
                        </span>
                    </div>

                    <div class="note-total-row total">
                        <span>
                            Total
                        </span>

                        <span>
                            ${formatMoney(
                                total,
                                currency
                            )}
                        </span>
                    </div>

                    ${
                        paid > 0
                            ? `
                                <div
                                    class="note-total-row advance"
                                >
                                    <span>
                                        Pagado
                                    </span>

                                    <span>
                                        ${formatMoney(
                                            paid,
                                            currency
                                        )}
                                    </span>
                                </div>
                            `
                            : ""
                    }

                    <div class="note-total-row balance">
                        <span>
                            Saldo adeudado
                        </span>

                        <span>
                            ${formatMoney(
                                balance,
                                currency
                            )}
                        </span>
                    </div>

                </div>

            </div>


            <div class="note-bottom-content">

                <section class="note-notes">

                    <div class="note-section-title">
                        Notas
                    </div>

                    <div class="note-customer-notes">
                        ${
                            notesText
                                ? escapeHTML(
                                    notesText
                                )
                                : escapeHTML(
                                    business.message ||
                                    "Gracias por su confianza."
                                )
                        }
                    </div>

                </section>


                <section class="note-terms">

                    <div class="note-terms-heading">
                        Términos y condiciones
                    </div>

                    <div class="note-terms-subtitle">
                        TÉRMINOS Y CONDICIONES DEL SERVICIO
                    </div>

                    <ol>
                        ${termsHTML}
                    </ol>

                    <div class="note-acceptance">
                        *Al entregar tus prendas aceptas
                        y confirmas la conformidad con estos términos.*
                    </div>

                </section>

            </div>


            <footer class="note-footer">
                Pisada Bacana · Sneaker Cleaning
            </footer>
        `;
    }


    /* =================================================
       ABRIR / CERRAR
    ================================================= */

    async function openServiceNote(
        orderId
    ) {
        try {
            const database =
                getDatabase();

            const [
                order,
                settings
            ] =
                await Promise.all([
                    findOrder(orderId),
                    database.getSettings()
                ]);

            if (!order) {
                window.alert(
                    "No se encontró el pedido."
                );

                return;
            }

            currentNoteOrder =
                order;

            currentNoteSettings =
                settings || {};

            const modal =
                ensureNoteModal();

            renderServiceNote(
                order,
                currentNoteSettings
            );

            const toolbarCode =
                document.getElementById(
                    "noteToolbarCode"
                );

            if (toolbarCode) {
                toolbarCode.textContent =
                    `Nota ${order.code || ""}`;
            }

            modal.classList.add(
                "visible"
            );

            document.body.classList.add(
                "no-scroll"
            );

        } catch (error) {
            console.error(
                "No se pudo cargar la nota:",
                error
            );

            window.alert(
                "No se pudo cargar la nota desde Firebase."
            );
        }
    }


    function closeServiceNote() {
        const modal =
            document.getElementById(
                "serviceNoteModal"
            );

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "visible"
        );

        currentNoteOrder =
            null;

        currentNoteSettings =
            null;

        const otherOpenElement =
            document.querySelector(
                ".modal.visible, .drawer.visible, .sidebar.open"
            );

        if (!otherOpenElement) {
            document.body.classList.remove(
                "no-scroll"
            );
        }
    }


    /* =================================================
       IMÁGENES
    ================================================= */

    async function waitForImages(
        element
    ) {
        const images =
            Array.from(
                element.querySelectorAll(
                    "img"
                )
            );

        await Promise.all(
            images.map(
                image => {

                    if (
                        image.complete &&
                        image.naturalWidth > 0
                    ) {
                        return Promise.resolve();
                    }

                    return new Promise(
                        resolve => {

                            const finish =
                                () => resolve();

                            image.addEventListener(
                                "load",
                                finish,
                                {
                                    once: true
                                }
                            );

                            image.addEventListener(
                                "error",
                                finish,
                                {
                                    once: true
                                }
                            );

                            setTimeout(
                                finish,
                                3000
                            );
                        }
                    );
                }
            )
        );
    }


    /* =================================================
       PDF
    ================================================= */

    async function generateServiceNotePDF() {
        if (!currentNoteOrder) {
            throw new Error(
                "No hay una nota cargada."
            );
        }

        if (
            typeof window.html2canvas !==
            "function"
        ) {
            throw new Error(
                "html2canvas no está disponible."
            );
        }

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {
            throw new Error(
                "jsPDF no está disponible."
            );
        }

        const note =
            document.getElementById(
                "serviceNote"
            );

        if (!note) {
            throw new Error(
                "No se encontró la nota."
            );
        }

        if (document.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch {
                // Continuamos.
            }
        }

        await waitForImages(
            note
        );

        const previousTransform =
            note.style.transform;

        const previousWidth =
            note.style.width;

        const previousMinWidth =
            note.style.minWidth;

        note.style.transform =
            "none";

        note.style.width =
            "210mm";

        note.style.minWidth =
            "210mm";

        try {

            const canvas =
                await window.html2canvas(
                    note,
                    {
                        scale: 2,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor:
                            "#ffffff",
                        logging: false,
                        imageTimeout: 5000,
                        scrollX: 0,
                        scrollY: 0
                    }
                );

            const {
                jsPDF
            } = window.jspdf;

            const pdf =
                new jsPDF({
                    orientation:
                        "portrait",
                    unit:
                        "mm",
                    format:
                        "a4",
                    compress:
                        true
                });

            const pageWidth =
                pdf.internal.pageSize
                    .getWidth();

            const pageHeight =
                pdf.internal.pageSize
                    .getHeight();

            const imageWidth =
                pageWidth;

            const imageHeight =
                canvas.height *
                imageWidth /
                canvas.width;

            const pageHeightPx =
                Math.floor(
                    canvas.width *
                    pageHeight /
                    pageWidth
                );

            if (
                imageHeight <=
                pageHeight
            ) {
                const imageData =
                    canvas.toDataURL(
                        "image/jpeg",
                        0.96
                    );

                pdf.addImage(
                    imageData,
                    "JPEG",
                    0,
                    0,
                    imageWidth,
                    imageHeight,
                    undefined,
                    "FAST"
                );
            } else {
                let sourceY = 0;
                let pageIndex = 0;

                while (
                    sourceY <
                    canvas.height
                ) {
                    const sliceHeight =
                        Math.min(
                            pageHeightPx,
                            canvas.height -
                            sourceY
                        );

                    const sliceCanvas =
                        document.createElement(
                            "canvas"
                        );

                    sliceCanvas.width =
                        canvas.width;

                    sliceCanvas.height =
                        sliceHeight;

                    const context =
                        sliceCanvas.getContext(
                            "2d"
                        );

                    context.fillStyle =
                        "#ffffff";

                    context.fillRect(
                        0,
                        0,
                        sliceCanvas.width,
                        sliceCanvas.height
                    );

                    context.drawImage(
                        canvas,
                        0,
                        sourceY,
                        canvas.width,
                        sliceHeight,
                        0,
                        0,
                        canvas.width,
                        sliceHeight
                    );

                    const pageImage =
                        sliceCanvas.toDataURL(
                            "image/jpeg",
                            0.96
                        );

                    const sliceHeightMM =
                        sliceHeight *
                        imageWidth /
                        canvas.width;

                    if (
                        pageIndex > 0
                    ) {
                        pdf.addPage();
                    }

                    pdf.addImage(
                        pageImage,
                        "JPEG",
                        0,
                        0,
                        imageWidth,
                        sliceHeightMM,
                        undefined,
                        "FAST"
                    );

                    sourceY +=
                        sliceHeight;

                    pageIndex += 1;
                }
            }

            const blob =
                pdf.output(
                    "blob"
                );

            const fileName =
                `${sanitizeFileName(
                    currentNoteOrder.code ||
                    "nota"
                )}.pdf`;

            return {
                blob,
                fileName,
                pdf
            };

        } finally {

            note.style.transform =
                previousTransform;

            note.style.width =
                previousWidth;

            note.style.minWidth =
                previousMinWidth;
        }
    }


    /* =================================================
       DESCARGAR
    ================================================= */

    function downloadBlob(
        blob,
        fileName
    ) {
        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            fileName;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        setTimeout(
            () => {
                URL.revokeObjectURL(
                    url
                );
            },
            1000
        );
    }


    /* =================================================
       COMPARTIR
    ================================================= */

    async function shareServiceNotePDF() {
        if (
            isGeneratingPDF
        ) {
            return;
        }

        const button =
            document.getElementById(
                "shareServiceNoteButton"
            );

        const originalText =
            button?.textContent ||
            "Enviar PDF por WhatsApp";

        isGeneratingPDF =
            true;

        if (button) {
            button.disabled =
                true;

            button.textContent =
                "Generando PDF...";
        }

        try {
            const {
                blob,
                fileName
            } =
                await generateServiceNotePDF();

            const file =
                new File(
                    [blob],
                    fileName,
                    {
                        type:
                            "application/pdf"
                    }
                );

            const shareData = {
                files:
                    [file],

                title:
                    `Nota ${currentNoteOrder?.code || ""}`,

                text:
                    `Nota de servicio ${currentNoteOrder?.code || ""} - Pisada Bacana`
            };

            if (
                navigator.share &&
                navigator.canShare &&
                navigator.canShare({
                    files:
                        [file]
                })
            ) {
                try {
                    await navigator.share(
                        shareData
                    );

                    return;
                } catch (error) {
                    if (
                        error?.name ===
                        "AbortError"
                    ) {
                        return;
                    }

                    console.warn(
                        "No se pudo compartir directamente:",
                        error
                    );
                }
            }

            downloadBlob(
                blob,
                fileName
            );

            window.alert(
                "La nota se descargó en PDF. Ábrela o adjúntala desde WhatsApp."
            );

        } catch (error) {
            console.error(
                "No se pudo generar la nota PDF:",
                error
            );

            window.alert(
                "No se pudo generar el PDF de la nota. Revisa la consola del navegador."
            );

        } finally {
            isGeneratingPDF =
                false;

            if (button) {
                button.disabled =
                    false;

                button.textContent =
                    originalText;
            }
        }
    }


    /* =================================================
       BOTÓN DEL DRAWER
    ================================================= */

    function createDrawerNoteButton() {
        const drawerFooter =
            document.querySelector(
                "#orderDrawer .drawer-footer"
            );

        if (!drawerFooter) {
            return;
        }

        const oldButton =
            document.getElementById(
                "printOrderNoteButton"
            );

        if (oldButton) {
            const replacement =
                oldButton.cloneNode(
                    true
                );

            replacement.id =
                "openServiceNoteButton";

            replacement.textContent =
                "Nota de servicio";

            oldButton.replaceWith(
                replacement
            );
        }

        let button =
            document.getElementById(
                "openServiceNoteButton"
            );

        if (!button) {
            button =
                document.createElement(
                    "button"
                );

            button.id =
                "openServiceNoteButton";

            button.type =
                "button";

            button.className =
                "secondary-button";

            button.textContent =
                "Nota de servicio";

            drawerFooter.prepend(
                button
            );
        }

        if (
            button.dataset.noteReady ===
            "1"
        ) {
            return;
        }

        button.dataset.noteReady =
            "1";

        button.addEventListener(
            "click",
            () => {

                const codeElement =
                    document.getElementById(
                        "detailOrderCode"
                    );

                const code =
                    String(
                        codeElement?.textContent ||
                        ""
                    ).trim();

                if (!code) {
                    window.alert(
                        "No se encontró el folio del pedido."
                    );

                    return;
                }

                openServiceNote(
                    code
                );
            }
        );
    }


    /* =================================================
       EVENTOS
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }

            const modal =
                document.getElementById(
                    "serviceNoteModal"
                );

            if (
                modal?.classList.contains(
                    "visible"
                )
            ) {
                closeServiceNote();
            }
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "#orderDrawer"
                )
            ) {
                setTimeout(
                    createDrawerNoteButton,
                    0
                );
            }
        }
    );


    const observer =
        new MutationObserver(
            () => {
                createDrawerNoteButton();
            }
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );


    /* =================================================
       API PÚBLICA
    ================================================= */

    window.PisadaBacanaNote = {
        open:
            openServiceNote,

        close:
            closeServiceNote,

        sharePDF:
            shareServiceNotePDF,

        generatePDF:
            generateServiceNotePDF
    };


    createDrawerNoteButton();

})();