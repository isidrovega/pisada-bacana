"use strict";

/* =====================================================
   PISADA BACANA
   GENERADOR DE NOTAS DE SERVICIO
===================================================== */

(function () {

    const ORDERS_STORAGE_KEY =
        "pisadaBacanaOrders";

    const SETTINGS_STORAGE_KEY =
        "pisadaBacanaSettings";


    let currentNoteOrderId = null;


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


    function formatMoney(value) {

        return new Intl.NumberFormat(
            "es-MX",
            {
                style: "currency",
                currency: "MXN",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(
            Number(value) || 0
        );

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


    function loadOrders() {

        try {

            const stored =
                localStorage.getItem(
                    ORDERS_STORAGE_KEY
                );


            if (!stored) {
                return [];
            }


            const parsed =
                JSON.parse(stored);


            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch (error) {

            console.error(
                "No fue posible cargar los pedidos:",
                error
            );

            return [];

        }

    }


    function loadSettings() {

        try {

            const stored =
                localStorage.getItem(
                    SETTINGS_STORAGE_KEY
                );


            if (!stored) {
                return {};
            }


            const parsed =
                JSON.parse(stored);


            return (
                parsed &&
                typeof parsed === "object"
            )
                ? parsed
                : {};

        } catch (error) {

            console.error(
                "No fue posible cargar los ajustes:",
                error
            );

            return {};

        }

    }


    /* =================================================
       PEDIDOS
    ================================================= */

    function findOrder(orderId) {

        const orders =
            loadOrders();


        return (
            orders.find(
                order =>
                    String(order.id) ===
                    String(orderId)
            ) ||
            orders.find(
                order =>
                    String(order.code) ===
                    String(orderId)
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


        return [
            {
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
            }
        ];

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
                order.price || 0
            ),
            0
        );

    }


    function getPaidAmount(order) {

        return Math.max(
            Number(
                order.advance || 0
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
       DATOS DEL NEGOCIO
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
                String(object[key]).trim() !== ""
            ) {

                return object[key];

            }

        }


        return fallback;

    }


    function getBusinessData() {

        const settings =
            loadSettings();


        /*
            Se buscan varias estructuras para mantener
            compatibilidad con diferentes versiones
            del módulo Ajustes.
        */

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
                        "direccion"
                    ],
                    "Blvd. Jardin De Las Orquideas #3168"
                ),

            address2:
                firstValue(
                    business,
                    [
                        "address2",
                        "neighborhood",
                        "colonia"
                    ],
                    "Jardines Del Rey"
                ),

            city:
                firstValue(
                    business,
                    [
                        "city",
                        "ciudad"
                    ],
                    "Culiacan, Sinaloa. Sinaloa 80025"
                ),

            country:
                firstValue(
                    business,
                    [
                        "country",
                        "pais"
                    ],
                    "Mexico"
                ),

            phone:
                firstValue(
                    business,
                    [
                        "phone",
                        "telefono",
                        "businessPhone"
                    ],
                    "6671400648"
                ),

            email:
                firstValue(
                    business,
                    [
                        "email",
                        "correo",
                        "businessEmail"
                    ],
                    "pisadabacana@gmail.com"
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


    /* =================================================
       TÉRMINOS
    ================================================= */

    function getTerms() {

        const settings =
            loadSettings();


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


    /* =================================================
       DESCRIPCIÓN DE ARTÍCULO
    ================================================= */

    function buildItemDescription(item) {

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
            parts.length === 0 &&
            item.itemType
        ) {

            parts.push(
                item.itemType
            );

        }


        return parts.join(" ");

    }


    /* =================================================
       CREAR MODAL
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

    function renderServiceNote(order) {

        const note =
            document.getElementById(
                "serviceNote"
            );


        if (!note) {
            return;
        }


        const business =
            getBusinessData();

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

        const terms =
            getTerms();


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
                                    ${Number(
                                        item.price || 0
                                    ).toFixed(2)}
                                </td>

                                <td>
                                    ${Number(
                                        item.price || 0
                                    ).toFixed(2)}
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

            <!-- ==========================
                 HEADER
            =========================== -->

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

                    </div>

                </div>


                <div class="note-document-info">

                    <h1>
                        NOTA
                    </h1>

                    <div class="note-document-code">
                        # ${escapeHTML(
                            order.code ||
                            "SIN-FOLIO"
                        )}
                    </div>

                    <div class="note-balance-label">
                        Saldo adeudado
                    </div>

                    <div class="note-balance-value">
                        ${formatMoney(
                            balance
                        )}
                    </div>

                </div>

            </header>


            <!-- ==========================
                 CLIENTE / FECHAS
            =========================== -->

            <section class="note-meta-section">

                <div>

                    <div class="note-client-label">
                        Cliente
                    </div>

                    <div class="note-client-name">
                        ${escapeHTML(
                            order.clientName ||
                            "CLIENTE"
                        )}
                    </div>

                    <div class="note-client-phone">
                        ${escapeHTML(
                            order.phone || ""
                        )}
                    </div>

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


            <!-- ==========================
                 ARTÍCULOS
            =========================== -->

            <table class="note-table">

                <thead>

                    <tr>

                        <th>#</th>

                        <th>
                            Artículo &amp; Descripción
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


            <!-- ==========================
                 TOTALES
            =========================== -->

            <div class="note-totals-wrapper">

                <div class="note-totals">

                    <div class="note-total-row">

                        <span>
                            Subtotal
                        </span>

                        <span>
                            ${formatMoney(total)}
                        </span>

                    </div>


                    <div class="note-total-row total">

                        <span>
                            Total
                        </span>

                        <span>
                            ${formatMoney(total)}
                        </span>

                    </div>


                    <div class="note-total-row advance">

                        <span>
                            Anticipo / Pagado
                        </span>

                        <span>
                            ${formatMoney(paid)}
                        </span>

                    </div>


                    <div class="note-total-row balance">

                        <span>
                            Saldo adeudado
                        </span>

                        <span>
                            ${formatMoney(balance)}
                        </span>

                    </div>

                </div>

            </div>


            <!-- ==========================
                 NOTAS / TÉRMINOS
            =========================== -->

            <div class="note-bottom-content">

                <div class="note-section-title">
                    Notas
                </div>


                <div class="note-customer-notes">

                    ${
                        order.notes
                            ? escapeHTML(
                                order.notes
                            )
                            : "Gracias por su confianza."
                    }

                </div>


                <div class="note-terms">

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
                        *Al entregar tus prendas aceptas y confirmas la conformidad con estos términos.*
                    </div>

                </div>

            </div>


            <!-- ==========================
                 FOOTER
            =========================== -->

            <footer class="note-footer">

                Gracias por confiar en
                <strong>
                    Pisada Bacana
                </strong>.

            </footer>
        `;

    }


    /* =================================================
       ABRIR / CERRAR
    ================================================= */

    function openServiceNote(orderId) {

        const order =
            findOrder(orderId);


        if (!order) {

            console.error(
                "No se encontró el pedido:",
                orderId
            );

            return;

        }


        const modal =
            ensureNoteModal();


        currentNoteOrderId =
            order.id;


        renderServiceNote(order);


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


        currentNoteOrderId = null;


        /*
            No quitamos no-scroll si otro
            modal/drawer del sistema sigue abierto.
        */

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
       IMPRESIÓN / PDF
    ================================================= */

    function printServiceNote() {

        if (!currentNoteOrderId) {
            return;
        }


        window.print();

    }


    /* =================================================
       BOTÓN PARA DRAWER
    ================================================= */

    function createDrawerNoteButton() {

        const drawerFooter =
            document.querySelector(
                "#orderDrawer .drawer-footer"
            );


        if (!drawerFooter) {
            return;
        }


        if (
            document.getElementById(
                "printOrderNoteButton"
            )
        ) {
            return;
        }


        const button =
            document.createElement(
                "button"
            );


        button.id =
            "printOrderNoteButton";

        button.type =
            "button";

        button.className =
            "secondary-button";

        button.textContent =
            "Ver / imprimir nota";


        button.addEventListener(
            "click",
            () => {

                /*
                    pedidos.js mantiene el ID
                    seleccionado internamente.
                    Lo obtenemos del folio visible
                    para evitar acoplar ambos módulos.
                */

                const codeElement =
                    document.getElementById(
                        "detailOrderCode"
                    );


                if (!codeElement) {
                    return;
                }


                const code =
                    codeElement.textContent
                        .trim();


                if (!code) {
                    return;
                }


                openServiceNote(code);

            }
        );


        /*
            Se coloca antes del botón
            Guardar cambios.
        */

        const saveButton =
            document.getElementById(
                "saveOrderChangesButton"
            );


        if (saveButton) {

            drawerFooter.insertBefore(
                button,
                saveButton
            );

        } else {

            drawerFooter.appendChild(
                button
            );

        }

    }


    /* =================================================
       EXPONER API
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
            initialize
        );

    } else {

        initialize();

    }

})();