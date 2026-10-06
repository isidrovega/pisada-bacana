"use strict";

/* =====================================================
   PISADA BACANA
   NOTA DE SERVICIO
===================================================== */

(() => {

    let currentNoteOrderId =
        null;


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
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function formatMoney(
        value,
        currency = "MXN"
    ) {
        try {
            return new Intl.NumberFormat(
                "es-MX",
                {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ).format(
                Number(value) || 0
            );
        } catch {
            return `$${Number(value || 0).toFixed(2)}`;
        }
    }


    function formatNoteDate(value) {
        if (!value) {
            return "Sin fecha";
        }

        let date;

        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(
                    String(value)
                )
        ) {
            const [
                year,
                month,
                day
            ] =
                String(value)
                    .split("-")
                    .map(Number);

            date =
                new Date(
                    year,
                    month - 1,
                    day
                );

        } else {
            date =
                new Date(value);
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

        /*
            Primero por ID real de Firestore.
        */
        try {
            const directOrder =
                await database
                    .getOrder(value);

            if (directOrder) {
                return directOrder;
            }
        } catch (error) {
            console.warn(
                "No se encontró directamente por ID:",
                error
            );
        }

        /*
            El botón del drawer también puede
            enviar el folio visible.
        */
        const orders =
            await database
                .getOrders();

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
                order.total ??
                order.price ??
                0
            ),
            0
        );
    }


    function getPaidAmount(order) {
        if (
            Array.isArray(
                order.payments
            )
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


    function getBalance(order) {
        return Math.max(
            getOrderTotal(order) -
            getPaidAmount(order),
            0
        );
    }


    /* =================================================
       NEGOCIO
    ================================================= */

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
                String(
                    object[key]
                ).trim() !== ""
            ) {
                return object[key];
            }
        }

        return fallback;
    }


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
                    "Pisada Bacana"
                ),

            address:
                firstValue(
                    business,
                    [
                        "address",
                        "street",
                        "direccion"
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
                        "mensaje"
                    ],
                    "Gracias por confiar en Pisada Bacana."
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
                    ""
                )
        };
    }


    function getTerms(
        settings = {}
    ) {
        if (
            Array.isArray(
                settings.terms
            ) &&
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
            settings.business
                .terms.length
        ) {
            return settings.business
                .terms
                .map(String)
                .filter(Boolean);
        }

        return [
            "Recepción: Todo calzado o gorra se recibe bajo revisión previa. Los detalles de desgaste, manchas fijas o daños previos se consideran parte de la condición de recepción.",
            "Calzado o prendas olvidadas: Pasados 30 días a partir de la fecha estimada de entrega, no nos hacemos responsables por el deterioro, pérdida o resguardo de las prendas.",
            "Resultados: Hacemos nuestro mejor esfuerzo por eliminar manchas y suciedad, pero el resultado final depende del material, antigüedad y condición previa del artículo.",
            "Garantía: Tienes 48 horas a partir de la entrega para señalar cualquier disconformidad con el servicio realizado."
        ];
    }


    function buildItemDescription(
        item
    ) {
        const parts = [
            item.brand,
            item.model,
            item.color
        ]
            .map(
                value =>
                    String(
                        value || ""
                    ).trim()
            )
            .filter(Boolean);

        if (
            !parts.length &&
            item.itemType
        ) {
            parts.push(
                item.itemType
            );
        }

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
                        COMPROBANTE DE SERVICIO
                    </span>

                    <strong id="noteToolbarCode">
                        Nota
                    </strong>
                </div>

                <div class="note-toolbar-actions">
                    <button
                        type="button"
                        class="note-toolbar-button primary"
                        id="printServiceNoteButton"
                    >
                        Imprimir / Guardar PDF
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

        document.body
            .appendChild(modal);

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
                "printServiceNoteButton"
            )
            .addEventListener(
                "click",
                printServiceNote
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
            settings.orders
                ?.currency ||
            "MXN";

        const items =
            getOrderItems(order);

        const total =
            getOrderTotal(order);

        const paid =
            Math.min(
                getPaidAmount(order),
                total
            );

        const balance =
            getBalance(order);

        const logoHTML =
            business.logo
                ? `
                    <img
                        src="${escapeHTML(
                            business.logo
                        )}"
                        alt="${escapeHTML(
                            business.name
                        )}"
                    >
                `
                : `
                    <div
                        class="note-company-logo-fallback"
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
                                    ${formatMoney(
                                        item.price,
                                        currency
                                    )}
                                </td>

                                <td>
                                    ${formatMoney(
                                        item.price,
                                        currency
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

        note.innerHTML = `
            <header class="note-header">
                <div>
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
                                ? `<span>${escapeHTML(
                                    business.address
                                )}</span>`
                                : ""
                        }

                        ${
                            business.address2
                                ? `<span>${escapeHTML(
                                    business.address2
                                )}</span>`
                                : ""
                        }

                        ${
                            business.city
                                ? `<span>${escapeHTML(
                                    business.city
                                )}</span>`
                                : ""
                        }

                        ${
                            business.country
                                ? `<span>${escapeHTML(
                                    business.country
                                )}</span>`
                                : ""
                        }

                        ${
                            business.phone
                                ? `<span>${escapeHTML(
                                    business.phone
                                )}</span>`
                                : ""
                        }

                        ${
                            business.email
                                ? `<span>${escapeHTML(
                                    business.email
                                )}</span>`
                                : ""
                        }

                        ${
                            business.instagram
                                ? `<span>${escapeHTML(
                                    business.instagram
                                )}</span>`
                                : ""
                        }
                    </div>
                </div>

                <div class="note-document-info">
                    <span>
                        COMPROBANTE DE SERVICIO
                    </span>

                    <strong>
                        ${escapeHTML(
                            order.code ||
                            "Sin folio"
                        )}
                    </strong>

                    <small>
                        ${formatNoteDate(
                            order.createdAt
                        )}
                    </small>
                </div>
            </header>

            <section class="note-section">
                <div class="note-section-title">
                    DATOS DEL CLIENTE
                </div>

                <div class="note-client-grid">
                    <div>
                        <span>Cliente</span>
                        <strong>
                            ${escapeHTML(
                                order.clientName ||
                                "Sin cliente"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Teléfono</span>
                        <strong>
                            ${escapeHTML(
                                order.phone ||
                                "Sin teléfono"
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Fecha estimada de entrega</span>
                        <strong>
                            ${escapeHTML(
                                formatNoteDate(
                                    order.deliveryDate
                                )
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Estado</span>
                        <strong>
                            ${escapeHTML(
                                order.status ||
                                "Recibido"
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            <section class="note-section">
                <div class="note-section-title">
                    SERVICIOS
                </div>

                <div class="note-table-wrap">
                    <table class="note-items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Descripción</th>
                                <th>Cant.</th>
                                <th>Precio</th>
                                <th>Importe</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${itemsHTML}
                        </tbody>
                    </table>
                </div>
            </section>

            ${
                order.notes
                    ? `
                        <section class="note-section">
                            <div class="note-section-title">
                                OBSERVACIONES
                            </div>

                            <div class="note-observations">
                                ${escapeHTML(
                                    order.notes
                                )}
                            </div>
                        </section>
                    `
                    : ""
            }

            <section class="note-summary">
                <div class="note-payment-info">
                    <span>
                        Método de pago
                    </span>

                    <strong>
                        ${escapeHTML(
                            order.paymentMethod ||
                            "No especificado"
                        )}
                    </strong>
                </div>

                <div class="note-totals">
                    <div>
                        <span>Total</span>
                        <strong>
                            ${formatMoney(
                                total,
                                currency
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>Pagado</span>
                        <strong>
                            ${formatMoney(
                                paid,
                                currency
                            )}
                        </strong>
                    </div>

                    <div class="note-balance">
                        <span>Saldo</span>
                        <strong>
                            ${formatMoney(
                                balance,
                                currency
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            <section class="note-terms">
                <div class="note-section-title">
                    TÉRMINOS DEL SERVICIO
                </div>

                <ol>
                    ${termsHTML}
                </ol>

                <div class="note-terms-confirmation">
                    Al entregar tus prendas aceptas
                    y confirmas la conformidad con
                    estos términos.
                </div>
            </section>

            <footer class="note-footer">
                ${escapeHTML(
                    business.message ||
                    "Gracias por confiar en Pisada Bacana."
                )}
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

            const modal =
                ensureNoteModal();

            currentNoteOrderId =
                order.id;

            renderServiceNote(
                order,
                settings || {}
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
                "No se pudo consultar la nota:",
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

        currentNoteOrderId =
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


    function printServiceNote() {
        if (!currentNoteOrderId) {
            return;
        }

        window.print();
    }


    /* =================================================
       BOTÓN EN DRAWER
    ================================================= */

    function createDrawerNoteButton() {
        const footer =
            document.querySelector(
                "#orderDrawer .drawer-footer"
            );

        if (!footer) {
            return;
        }

        if (
            document.getElementById(
                "openServiceNoteButton"
            )
        ) {
            return;
        }

        const button =
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

        footer.insertBefore(
            button,
            footer.firstChild
        );
    }


    /* =================================================
       EVENTOS
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                document
                    .getElementById(
                        "serviceNoteModal"
                    )
                    ?.classList
                    .contains(
                        "visible"
                    )
            ) {
                closeServiceNote();
            }
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

        print:
            printServiceNote
    };


    /* =================================================
       INICIO
    ================================================= */

    function initialize() {
        ensureNoteModal();
        createDrawerNoteButton();
    }


    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }

})();