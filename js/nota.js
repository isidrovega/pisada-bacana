"use strict";

/* =====================================================
   PISADA BACANA
   NOTA DE SERVICIO + WHATSAPP
===================================================== */

(() => {

    /* =================================================
       ESTADO
    ================================================= */

    let currentNoteOrderId = null;
    let currentNoteOrder = null;
    let currentNoteSettings = null;


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
            Primero intentamos buscar directamente
            usando el ID del documento.
        */

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
                "No se encontró directamente por ID:",
                error
            );
        }


        /*
            Si recibimos un folio como PB-0001,
            buscamos dentro de todos los pedidos.
        */

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


        /*
            Compatibilidad con pedidos antiguos.
        */

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


    function getBalance(order) {
        const total =
            getOrderTotal(order);

        const paid =
            Math.min(
                getPaidAmount(order),
                total
            );

        return Math.max(
            total - paid,
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
            "Recepción: Todo calzado o gorra se recibe bajo revisión previa. Los detalles de desgaste, manchas fijas o daños previos se consideran parte de la condición de recepción.",
            "Calzado o prendas olvidadas: Pasados 30 días a partir de la fecha estimada de entrega, no nos hacemos responsables por el deterioro, pérdida o resguardo de las prendas.",
            "Resultados: Hacemos nuestro mejor esfuerzo por eliminar manchas y suciedad, pero el resultado final depende del material, antigüedad y condición previa del artículo.",
            "Garantía: Tienes 48 horas a partir de la entrega para señalar cualquier disconformidad con el servicio realizado."
        ];
    }


    function buildItemDescription(item) {
        const parts = [
            item.brand,
            item.model,
            item.color
        ]
            .map(
                value =>
                    String(value || "")
                        .trim()
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
                        id="sendWhatsAppNoteButton"
                    >
                        Enviar por WhatsApp
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
                "sendWhatsAppNoteButton"
            )
            .addEventListener(
                "click",
                sendServiceNoteWhatsApp
            );


        return modal;
    }


    /* =================================================
       RENDER NOTA
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
            Math.max(
                total - paid,
                0
            );


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
                        <span>
                            Fecha estimada de entrega
                        </span>

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
       ABRIR NOTA
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
                    findOrder(
                        orderId
                    ),

                    database.getSettings()
                ]);


            if (!order) {
                window.alert(
                    "No se encontró el pedido."
                );

                return;
            }


            currentNoteOrderId =
                order.id;

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
                "No se pudo consultar la nota:",
                error
            );

            window.alert(
                "No se pudo cargar la nota desde Firebase."
            );
        }
    }


    /* =================================================
       CERRAR NOTA
    ================================================= */

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

        currentNoteOrder =
            null;

        currentNoteSettings =
            null;


        /*
            Si sigue abierto el drawer,
            sidebar u otro modal, mantenemos
            bloqueado el scroll.
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
       WHATSAPP
    ================================================= */

    function normalizeWhatsAppPhone(
        value
    ) {
        let phone =
            String(value || "")
                .replace(/\D/g, "");


        if (!phone) {
            return "";
        }


        /*
            Si el teléfono mexicano está guardado
            como 10 dígitos, agregamos +52.

            WhatsApp wa.me requiere únicamente
            números, sin +, espacios ni guiones.
        */

        if (phone.length === 10) {
            phone =
                `52${phone}`;
        }


        return phone;
    }


    function buildWhatsAppMessage(
        order,
        settings = {}
    ) {
        const business =
            getBusinessData(
                settings
            );

        const currency =
            settings.orders?.currency ||
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
                getPaidAmount(
                    order
                ),
                total
            );

        const balance =
            Math.max(
                total - paid,
                0
            );


        const itemLines =
            items
                .map(
                    (item, index) => {

                        const description =
                            buildItemDescription(
                                item
                            );


                        const lines = [
                            `${index + 1}. *${item.service || "Servicio"}*`
                        ];


                        if (description) {
                            lines.push(
                                description
                            );
                        }


                        lines.push(
                            formatMoney(
                                item.price,
                                currency
                            )
                        );


                        return lines.join(
                            "\n"
                        );
                    }
                )
                .join("\n\n");


        const messageLines = [
            `*${business.name || "Pisada Bacana"}*`,
            "Comprobante de servicio",
            "",
            `*Folio:* ${order.code || "Sin folio"}`,
            `*Cliente:* ${order.clientName || "Sin cliente"}`,
            `*Estado:* ${order.status || "Recibido"}`,
            `*Entrega estimada:* ${formatNoteDate(
                order.deliveryDate
            )}`,
            "",
            "*Servicios*",
            "",
            itemLines,
            "",
            `*Total:* ${formatMoney(
                total,
                currency
            )}`,
            `*Pagado:* ${formatMoney(
                paid,
                currency
            )}`,
            `*Saldo:* ${formatMoney(
                balance,
                currency
            )}`
        ];


        if (
            String(
                order.notes || ""
            ).trim()
        ) {
            messageLines.push(
                "",
                "*Observaciones:*",
                String(
                    order.notes
                ).trim()
            );
        }


        /*
            Añadimos el mensaje configurado
            en Ajustes.
        */

        if (
            String(
                business.message || ""
            ).trim()
        ) {
            messageLines.push(
                "",
                String(
                    business.message
                ).trim()
            );
        }


        /*
            Datos de contacto opcionales
            del negocio.
        */

        const contactLines = [];


        if (business.phone) {
            contactLines.push(
                `Tel: ${business.phone}`
            );
        }


        if (business.instagram) {
            contactLines.push(
                `Instagram: ${business.instagram}`
            );
        }


        if (contactLines.length) {
            messageLines.push(
                "",
                contactLines.join(
                    "\n"
                )
            );
        }


        return messageLines
            .join("\n");
    }


    function sendServiceNoteWhatsApp() {
        if (!currentNoteOrder) {
            window.alert(
                "No hay una nota cargada."
            );

            return;
        }


        const phone =
            normalizeWhatsAppPhone(
                currentNoteOrder.phone
            );


        if (!phone) {
            const continueWithoutPhone =
                window.confirm(
                    "Este cliente no tiene teléfono registrado. ¿Quieres abrir WhatsApp y elegir el contacto manualmente?"
                );


            if (!continueWithoutPhone) {
                return;
            }
        }


        const message =
            buildWhatsAppMessage(
                currentNoteOrder,
                currentNoteSettings || {}
            );


        const encodedMessage =
            encodeURIComponent(
                message
            );


        /*
            Con teléfono:
            abre directamente el chat del cliente.

            Sin teléfono:
            abre WhatsApp con el mensaje para
            seleccionar el contacto manualmente.
        */

        const whatsappURL =
            phone
                ? `https://wa.me/${phone}?text=${encodedMessage}`
                : `https://wa.me/?text=${encodedMessage}`;


        const whatsappWindow =
            window.open(
                whatsappURL,
                "_blank",
                "noopener,noreferrer"
            );


        /*
            Algunos navegadores pueden bloquear
            ventanas nuevas.
        */

        if (!whatsappWindow) {
            window.location.href =
                whatsappURL;
        }
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


        /*
            Compatibilidad:
            evitamos crear dos botones si existe
            el ID antiguo o el nuevo.
        */

        const existingButton =
            document.getElementById(
                "openServiceNoteButton"
            ) ||
            document.getElementById(
                "printOrderNoteButton"
            );


        if (existingButton) {
            /*
                Si existe el botón de una versión
                anterior, actualizamos su texto.
            */

            existingButton.textContent =
                "Nota de servicio";

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

                /*
                    Obtenemos el folio que ya muestra
                    el drawer de pedidos.
                */

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


        /*
            Lo insertamos antes de Guardar cambios
            cuando ese botón está disponible.
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
       ESC
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
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


    /* =================================================
       API PÚBLICA
    ================================================= */

    window.PisadaBacanaNote = {

        open:
            openServiceNote,

        close:
            closeServiceNote,

        whatsapp:
            sendServiceNoteWhatsApp

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
            {
                once: true
            }
        );

    } else {
        initialize();
    }

})();