"use strict";


/* =====================================================
   FIRESTORE
===================================================== */

function getDatabase() {
    if (!window.PisadaBacanaDB) {
        throw new Error(
            "Firebase todavía no está listo."
        );
    }

    return window.PisadaBacanaDB;
}


function waitForFirestore() {
    if (window.PisadaBacanaDB) {
        return Promise.resolve();
    }

    return new Promise(
        (resolve, reject) => {
            const timeout =
                setTimeout(
                    () => {
                        reject(
                            new Error(
                                "Firebase tardó demasiado en iniciar."
                            )
                        );
                    },
                    10000
                );

            window.addEventListener(
                "pisadabacana:firestore-ready",
                () => {
                    clearTimeout(
                        timeout
                    );

                    resolve();
                },
                {
                    once: true
                }
            );

            window.addEventListener(
                "pisadabacana:firestore-error",
                event => {
                    clearTimeout(
                        timeout
                    );

                    reject(
                        event.detail?.error ||
                        new Error(
                            "No se pudo iniciar Firebase."
                        )
                    );
                },
                {
                    once: true
                }
            );
        }
    );
}


/* =====================================================
   DEFAULTS
===================================================== */

const DEFAULT_SETTINGS = {
    business: {
        name:
            "Pisada Bacana",

        phone:
            "",

        address:
            "",

        instagram:
            "",

        message:
            "Gracias por confiar en Pisada Bacana."
    },

    services: [
        {
            id:
                "service-basic",

            name:
                "Lavado básico",

            price:
                0,

            type:
                "Tenis"
        },
        {
            id:
                "service-deep",

            name:
                "Lavado profundo",

            price:
                0,

            type:
                "Tenis"
        },
        {
            id:
                "service-restoration",

            name:
                "Restauración",

            price:
                0,

            type:
                "Tenis"
        },
        {
            id:
                "service-cap",

            name:
                "Lavado de gorra",

            price:
                0,

            type:
                "Gorra"
        }
    ],

    paymentMethods: {
        cash:
            true,

        transfer:
            true,

        card:
            false
    },

    orders: {
        folioPrefix:
            "PB",

        defaultDeliveryDays:
            3,

        currency:
            "MXN",

        initialStatus:
            "Recibido"
    }
};


/* =====================================================
   ESTADO
===================================================== */

let settings =
    cloneObject(
        DEFAULT_SETTINGS
    );

let orders = [];

let pendingConfirmAction =
    null;

let toastTimer =
    null;


/* =====================================================
   ELEMENTOS
===================================================== */

const sidebar =
    document.getElementById(
        "sidebar"
    );

const menuButton =
    document.getElementById(
        "menuButton"
    );

const overlay =
    document.getElementById(
        "overlay"
    );

const currentDate =
    document.getElementById(
        "currentDate"
    );

const navOrderCount =
    document.getElementById(
        "navOrderCount"
    );

const saveAllButton =
    document.getElementById(
        "saveAllButton"
    );


/* NEGOCIO */

const businessName =
    document.getElementById(
        "businessName"
    );

const businessPhone =
    document.getElementById(
        "businessPhone"
    );

const businessAddress =
    document.getElementById(
        "businessAddress"
    );

const businessInstagram =
    document.getElementById(
        "businessInstagram"
    );

const businessMessage =
    document.getElementById(
        "businessMessage"
    );


/* SERVICIOS */

const servicesList =
    document.getElementById(
        "servicesList"
    );

const addServiceButton =
    document.getElementById(
        "addServiceButton"
    );


/* PAGOS */

const paymentCash =
    document.getElementById(
        "paymentCash"
    );

const paymentTransfer =
    document.getElementById(
        "paymentTransfer"
    );

const paymentCard =
    document.getElementById(
        "paymentCard"
    );


/* PEDIDOS */

const folioPrefix =
    document.getElementById(
        "folioPrefix"
    );

const folioPreview =
    document.getElementById(
        "folioPreview"
    );

const defaultDeliveryDays =
    document.getElementById(
        "defaultDeliveryDays"
    );

const currency =
    document.getElementById(
        "currency"
    );

const initialStatus =
    document.getElementById(
        "initialStatus"
    );


/* DATOS */

const totalOrders =
    document.getElementById(
        "totalOrders"
    );

const totalClients =
    document.getElementById(
        "totalClients"
    );

const totalServices =
    document.getElementById(
        "totalServices"
    );

const totalValue =
    document.getElementById(
        "totalValue"
    );


/* RESPALDO */

const backupButton =
    document.getElementById(
        "backupButton"
    );

const restoreButton =
    document.getElementById(
        "restoreButton"
    );

const restoreFile =
    document.getElementById(
        "restoreFile"
    );


/* BORRAR */

const deleteOrdersButton =
    document.getElementById(
        "deleteOrdersButton"
    );


/* CONFIRMACIÓN */

const confirmModal =
    document.getElementById(
        "confirmModal"
    );

const confirmTitle =
    document.getElementById(
        "confirmTitle"
    );

const confirmMessage =
    document.getElementById(
        "confirmMessage"
    );

const closeConfirmButton =
    document.getElementById(
        "closeConfirmButton"
    );

const cancelConfirmButton =
    document.getElementById(
        "cancelConfirmButton"
    );

const confirmActionButton =
    document.getElementById(
        "confirmActionButton"
    );


/* TOAST */

const toast =
    document.getElementById(
        "toast"
    );

const toastMessage =
    document.getElementById(
        "toastMessage"
    );


/* =====================================================
   SETTINGS
===================================================== */

function cloneObject(object) {
    return JSON.parse(
        JSON.stringify(object)
    );
}


function mergeSettings(saved) {
    const defaults =
        cloneObject(
            DEFAULT_SETTINGS
        );

    if (
        !saved ||
        typeof saved !== "object"
    ) {
        return defaults;
    }

    return {
        business: {
            ...defaults.business,

            ...(
                saved.business &&
                typeof saved.business ===
                    "object"
                    ? saved.business
                    : {}
            )
        },

        services:
            Array.isArray(
                saved.services
            )
                ? saved.services
                : defaults.services,

        paymentMethods: {
            ...defaults.paymentMethods,

            ...(
                saved.paymentMethods &&
                typeof saved
                    .paymentMethods ===
                    "object"
                    ? saved.paymentMethods
                    : {}
            )
        },

        orders: {
            ...defaults.orders,

            ...(
                saved.orders &&
                typeof saved.orders ===
                    "object"
                    ? saved.orders
                    : {}
            )
        },

        /*
            Conservamos campos adicionales,
            como terms, email, logo, etc.
        */
        ...saved
    };
}


/* =====================================================
   UTILIDADES
===================================================== */

function formatMoney(value) {
    const selectedCurrency =
        settings.orders
            ?.currency ||
        "MXN";

    try {
        return new Intl.NumberFormat(
            "es-MX",
            {
                style:
                    "currency",

                currency:
                    selectedCurrency,

                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    2
            }
        ).format(
            Number(value) || 0
        );
    } catch {
        return `$${Number(value || 0).toFixed(2)}`;
    }
}


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function normalizePrefix(value) {
    const cleaned =
        String(value || "")
            .toUpperCase()
            .replace(
                /[^A-Z0-9]/g,
                ""
            )
            .slice(0, 8);

    return cleaned || "PB";
}


function createId() {
    if (
        window.crypto &&
        typeof window.crypto
            .randomUUID ===
            "function"
    ) {
        return (
            "service-" +
            window.crypto.randomUUID()
        );
    }

    return (
        "service-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(16)
            .slice(2)
    );
}


function setCurrentDate() {
    currentDate.textContent =
        new Intl.DateTimeFormat(
            "es-MX",
            {
                weekday:
                    "long",

                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric"
            }
        ).format(
            new Date()
        );
}


/* =====================================================
   FORMULARIO
===================================================== */

function renderSettingsForm() {
    businessName.value =
        settings.business
            ?.name || "";

    businessPhone.value =
        settings.business
            ?.phone || "";

    businessAddress.value =
        settings.business
            ?.address || "";

    businessInstagram.value =
        settings.business
            ?.instagram || "";

    businessMessage.value =
        settings.business
            ?.message || "";

    paymentCash.checked =
        Boolean(
            settings.paymentMethods
                ?.cash
        );

    paymentTransfer.checked =
        Boolean(
            settings.paymentMethods
                ?.transfer
        );

    paymentCard.checked =
        Boolean(
            settings.paymentMethods
                ?.card
        );

    folioPrefix.value =
        settings.orders
            ?.folioPrefix ||
        "PB";

    defaultDeliveryDays.value =
        Number.isFinite(
            Number(
                settings.orders
                    ?.defaultDeliveryDays
            )
        )
            ? Number(
                settings.orders
                    .defaultDeliveryDays
            )
            : 3;

    currency.value =
        settings.orders
            ?.currency ||
        "MXN";

    initialStatus.value =
        settings.orders
            ?.initialStatus ||
        "Recibido";

    updateFolioPreview();
    renderServices();
}


/* =====================================================
   SERVICIOS
===================================================== */

function renderServices() {
    servicesList.innerHTML =
        "";

    if (
        !Array.isArray(
            settings.services
        ) ||
        !settings.services.length
    ) {
        servicesList.innerHTML = `
            <div class="services-empty">
                No hay servicios configurados.
                Usa "Agregar servicio" para crear uno.
            </div>
        `;

        return;
    }

    settings.services.forEach(
        service => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "service-row";

            row.dataset.id =
                service.id;

            row.innerHTML = `
                <input
                    class="service-input"
                    type="text"
                    maxlength="80"
                    value="${escapeHTML(
                        service.name
                    )}"
                    placeholder="Nombre del servicio"
                    aria-label="Nombre del servicio"
                >

                <input
                    class="service-price"
                    type="number"
                    min="0"
                    step="1"
                    value="${Number(
                        service.price || 0
                    )}"
                    placeholder="Precio"
                    aria-label="Precio del servicio"
                >

                <select
                    class="service-type"
                    aria-label="Tipo de artículo"
                >
                    <option
                        value="Tenis"
                        ${
                            service.type ===
                            "Tenis"
                                ? "selected"
                                : ""
                        }
                    >
                        Tenis
                    </option>

                    <option
                        value="Gorra"
                        ${
                            service.type ===
                            "Gorra"
                                ? "selected"
                                : ""
                        }
                    >
                        Gorra
                    </option>

                    <option
                        value="Ambos"
                        ${
                            service.type ===
                            "Ambos"
                                ? "selected"
                                : ""
                        }
                    >
                        Ambos
                    </option>
                </select>

                <button
                    class="delete-service"
                    type="button"
                    aria-label="Eliminar servicio"
                    title="Eliminar servicio"
                >
                    ×
                </button>
            `;

            const nameInput =
                row.querySelector(
                    ".service-input"
                );

            const priceInput =
                row.querySelector(
                    ".service-price"
                );

            const typeSelect =
                row.querySelector(
                    ".service-type"
                );

            const deleteButton =
                row.querySelector(
                    ".delete-service"
                );

            nameInput.addEventListener(
                "input",
                event => {
                    service.name =
                        event.target.value;
                }
            );

            priceInput.addEventListener(
                "input",
                event => {
                    service.price =
                        Math.max(
                            Number(
                                event.target.value
                            ) || 0,
                            0
                        );
                }
            );

            typeSelect.addEventListener(
                "change",
                event => {
                    service.type =
                        event.target.value;
                }
            );

            deleteButton.addEventListener(
                "click",
                () => {
                    requestRemoveService(
                        service.id
                    );
                }
            );

            servicesList
                .appendChild(row);
        }
    );
}


function addService() {
    if (
        !Array.isArray(
            settings.services
        )
    ) {
        settings.services = [];
    }

    settings.services.push({
        id:
            createId(),

        name:
            "Nuevo servicio",

        price:
            0,

        type:
            "Tenis"
    });

    renderServices();
    renderDataSummary();

    const rows =
        servicesList
            .querySelectorAll(
                ".service-row"
            );

    const lastRow =
        rows[
            rows.length - 1
        ];

    if (lastRow) {
        const input =
            lastRow.querySelector(
                ".service-input"
            );

        input?.focus();
        input?.select();
    }
}


function requestRemoveService(id) {
    const service =
        settings.services
            .find(
                item =>
                    item.id === id
            );

    if (!service) {
        return;
    }

    openConfirmModal({
        title:
            "Eliminar servicio",

        message:
            `Se eliminará "${service.name}". Los pedidos anteriores no serán modificados.`,

        confirmText:
            "Eliminar",

        action:
            async () => {
                settings.services =
                    settings.services
                        .filter(
                            item =>
                                item.id !== id
                        );

                try {
                    await getDatabase()
                        .saveSettings(
                            settings
                        );

                    renderServices();
                    renderDataSummary();

                    showToast(
                        "Servicio eliminado."
                    );

                } catch (error) {
                    console.error(
                        "No se pudo eliminar el servicio:",
                        error
                    );

                    showToast(
                        "No se pudo guardar el cambio.",
                        true
                    );
                }
            }
    });
}


/* =====================================================
   LEER FORMULARIO
===================================================== */

function collectFormSettings() {
    const prefix =
        normalizePrefix(
            folioPrefix.value
        );

    const deliveryDays =
        Math.min(
            Math.max(
                Number(
                    defaultDeliveryDays
                        .value
                ) || 0,
                0
            ),
            90
        );

    const previousBusiness =
        settings.business || {};

    settings.business = {
        ...previousBusiness,

        name:
            businessName.value
                .trim() ||
            "Pisada Bacana",

        phone:
            businessPhone.value
                .trim(),

        address:
            businessAddress.value
                .trim(),

        instagram:
            businessInstagram
                .value
                .trim(),

        message:
            businessMessage
                .value
                .trim()
    };

    settings.paymentMethods = {
        cash:
            paymentCash.checked,

        transfer:
            paymentTransfer.checked,

        card:
            paymentCard.checked
    };

    settings.orders = {
        ...(
            settings.orders || {}
        ),

        folioPrefix:
            prefix,

        defaultDeliveryDays:
            deliveryDays,

        currency:
            currency.value ||
            "MXN",

        initialStatus:
            initialStatus.value ||
            "Recibido"
    };

    settings.services =
        (Array.isArray(
            settings.services
        )
            ? settings.services
            : []
        )
            .map(
                service => ({
                    id:
                        service.id ||
                        createId(),

                    name:
                        String(
                            service.name ||
                            ""
                        ).trim(),

                    price:
                        Math.max(
                            Number(
                                service.price ||
                                0
                            ),
                            0
                        ),

                    type:
                        [
                            "Tenis",
                            "Gorra",
                            "Ambos"
                        ].includes(
                            service.type
                        )
                            ? service.type
                            : "Tenis"
                })
            )
            .filter(
                service =>
                    service.name
            );

    folioPrefix.value =
        prefix;

    defaultDeliveryDays.value =
        deliveryDays;
}


/* =====================================================
   GUARDAR
===================================================== */

async function saveAllSettings() {
    try {
        collectFormSettings();

        settings =
            mergeSettings(
                settings
            );

        await getDatabase()
            .saveSettings(
                settings
            );

        renderSettingsForm();
        renderDataSummary();

        showToast(
            "Ajustes guardados correctamente."
        );

    } catch (error) {
        console.error(
            "Error guardando ajustes:",
            error
        );

        showToast(
            "No se pudieron guardar los ajustes.",
            true
        );
    }
}


/* =====================================================
   FOLIO
===================================================== */

function updateFolioPreview() {
    const prefix =
        normalizePrefix(
            folioPrefix.value
        );

    folioPreview.textContent =
        `${prefix}-0001`;
}


/* =====================================================
   RESUMEN
===================================================== */

function renderDataSummary() {
    const clientKeys =
        new Set();

    orders.forEach(
        order => {
            const phone =
                String(
                    order.phone || ""
                )
                    .replace(
                        /\D/g,
                        ""
                    );

            const name =
                String(
                    order.clientName || ""
                )
                    .trim()
                    .toLowerCase();

            if (phone) {
                clientKeys.add(
                    `phone:${phone}`
                );

            } else if (name) {
                clientKeys.add(
                    `name:${name}`
                );
            }
        }
    );

    const value =
        orders.reduce(
            (total, order) =>
                total +
                Math.max(
                    Number(
                        order.total ??
                        order.price ??
                        0
                    ),
                    0
                ),
            0
        );

    totalOrders.textContent =
        orders.length;

    totalClients.textContent =
        clientKeys.size;

    totalServices.textContent =
        Array.isArray(
            settings.services
        )
            ? settings.services.length
            : 0;

    totalValue.textContent =
        formatMoney(value);

    navOrderCount.textContent =
        orders.filter(
            order =>
                String(
                    order.status || ""
                )
                    .trim()
                    .toLowerCase() !==
                "entregado"
        ).length;
}


/* =====================================================
   RESPALDO
===================================================== */

async function downloadBackup() {
    try {
        /*
            Primero guardamos lo que esté escrito
            actualmente en el formulario.
        */
        collectFormSettings();

        await getDatabase()
            .saveSettings(
                settings
            );

        const [
            firestoreOrders,
            firestoreSettings
        ] =
            await Promise.all([
                getDatabase()
                    .getOrders(),

                getDatabase()
                    .getSettings()
            ]);

        orders =
            firestoreOrders;

        if (firestoreSettings) {
            settings =
                mergeSettings(
                    firestoreSettings
                );
        }

        const backup = {
            app:
                "Pisada Bacana",

            version:
                2,

            exportedAt:
                new Date()
                    .toISOString(),

            source:
                "firebase-firestore",

            orders:
                firestoreOrders,

            settings
        };

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        backup,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        const date =
            new Date()
                .toISOString()
                .slice(0, 10);

        link.href =
            url;

        link.download =
            `pisada-bacana-respaldo-${date}.json`;

        document.body
            .appendChild(link);

        link.click();
        link.remove();

        URL.revokeObjectURL(
            url
        );

        showToast(
            "Respaldo descargado correctamente."
        );

    } catch (error) {
        console.error(
            "Error creando respaldo:",
            error
        );

        showToast(
            "No se pudo crear el respaldo.",
            true
        );
    }
}


/* =====================================================
   VALIDACIÓN RESPALDO
===================================================== */

function validateBackup(backup) {
    if (
        !backup ||
        typeof backup !== "object"
    ) {
        throw new Error(
            "Formato inválido."
        );
    }

    if (
        backup.app !==
        "Pisada Bacana"
    ) {
        throw new Error(
            "El respaldo no corresponde a Pisada Bacana."
        );
    }

    if (
        !Array.isArray(
            backup.orders
        )
    ) {
        throw new Error(
            "El respaldo no contiene pedidos válidos."
        );
    }

    if (
        !backup.settings ||
        typeof backup.settings !==
            "object"
    ) {
        throw new Error(
            "El respaldo no contiene ajustes válidos."
        );
    }

    return true;
}


/* =====================================================
   RESTAURAR
===================================================== */

function handleRestoreFile(event) {
    const file =
        event.target.files[0];

    if (!file) {
        return;
    }

    if (
        !file.name
            .toLowerCase()
            .endsWith(".json")
    ) {
        showToast(
            "Selecciona un archivo JSON válido.",
            true
        );

        restoreFile.value =
            "";

        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        () => {
            try {
                const backup =
                    JSON.parse(
                        reader.result
                    );

                validateBackup(
                    backup
                );

                openConfirmModal({
                    title:
                        "Restaurar respaldo",

                    message:
                        `El respaldo contiene ${backup.orders.length} pedidos. Los pedidos y ajustes actuales serán reemplazados.`,

                    confirmText:
                        "Restaurar",

                    action:
                        async () => {
                            try {
                                await getDatabase()
                                    .replaceOrders(
                                        backup.orders
                                    );

                                settings =
                                    mergeSettings(
                                        backup.settings
                                    );

                                await getDatabase()
                                    .saveSettings(
                                        settings
                                    );

                                orders =
                                    await getDatabase()
                                        .getOrders();

                                renderSettingsForm();
                                renderDataSummary();

                                showToast(
                                    "Respaldo restaurado correctamente."
                                );

                            } catch (error) {
                                console.error(
                                    "Error restaurando respaldo:",
                                    error
                                );

                                showToast(
                                    "No se pudo restaurar el respaldo.",
                                    true
                                );
                            }
                        }
                });

            } catch (error) {
                console.error(
                    "Respaldo inválido:",
                    error
                );

                showToast(
                    "El archivo no es un respaldo válido de Pisada Bacana.",
                    true
                );

            } finally {
                restoreFile.value =
                    "";
            }
        };

    reader.onerror =
        () => {
            showToast(
                "No se pudo leer el archivo.",
                true
            );

            restoreFile.value =
                "";
        };

    reader.readAsText(
        file
    );
}


/* =====================================================
   ELIMINAR PEDIDOS
===================================================== */

function requestDeleteOrders() {
    if (!orders.length) {
        showToast(
            "No hay pedidos para eliminar.",
            true
        );

        return;
    }

    openConfirmModal({
        title:
            "Eliminar todos los pedidos",

        message:
            `Se eliminarán permanentemente ${orders.length} pedidos, incluyendo pagos e historial derivado de clientes. Esta acción no se puede deshacer.`,

        confirmText:
            "Eliminar todo",

        action:
            async () => {
                try {
                    await getDatabase()
                        .deleteAllOrders();

                    orders = [];

                    renderDataSummary();

                    showToast(
                        "Todos los pedidos fueron eliminados."
                    );

                } catch (error) {
                    console.error(
                        "Error eliminando pedidos:",
                        error
                    );

                    showToast(
                        "No se pudieron eliminar los pedidos.",
                        true
                    );
                }
            }
    });
}


/* =====================================================
   CONFIRMACIÓN
===================================================== */

function openConfirmModal({
    title,
    message,
    confirmText,
    action
}) {
    pendingConfirmAction =
        typeof action === "function"
            ? action
            : null;

    confirmTitle.textContent =
        title ||
        "Confirmar acción";

    confirmMessage.textContent =
        message ||
        "¿Deseas continuar?";

    confirmActionButton.textContent =
        confirmText ||
        "Confirmar";

    confirmModal.classList.add(
        "visible"
    );

    overlay.classList.add(
        "visible"
    );

    document.body.classList.add(
        "modal-open"
    );

    confirmActionButton.focus();
}


function closeConfirmModal() {
    confirmModal.classList.remove(
        "visible"
    );

    if (
        !sidebar.classList.contains(
            "open"
        )
    ) {
        overlay.classList.remove(
            "visible"
        );
    }

    document.body.classList.remove(
        "modal-open"
    );

    pendingConfirmAction =
        null;
}


async function executeConfirmAction() {
    if (
        typeof pendingConfirmAction !==
        "function"
    ) {
        closeConfirmModal();
        return;
    }

    const action =
        pendingConfirmAction;

    closeConfirmModal();

    try {
        await action();
    } catch (error) {
        console.error(
            "Error ejecutando acción confirmada:",
            error
        );

        showToast(
            "No se pudo completar la acción.",
            true
        );
    }
}


/* =====================================================
   SIDEBAR
===================================================== */

function openSidebar() {
    sidebar.classList.add(
        "open"
    );

    overlay.classList.add(
        "visible"
    );

    document.body.style.overflow =
        "hidden";
}


function closeSidebar() {
    sidebar.classList.remove(
        "open"
    );

    if (
        !confirmModal.classList
            .contains(
                "visible"
            )
    ) {
        overlay.classList.remove(
            "visible"
        );
    }

    document.body.style.overflow =
        "";
}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message,
    isError = false
) {
    if (toastTimer) {
        clearTimeout(
            toastTimer
        );
    }

    toastMessage.textContent =
        message;

    toast.classList.toggle(
        "error",
        isError
    );

    toast.classList.add(
        "visible"
    );

    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "visible"
                );
            },
            3000
        );
}


/* =====================================================
   EVENTOS
===================================================== */

saveAllButton.addEventListener(
    "click",
    saveAllSettings
);

addServiceButton.addEventListener(
    "click",
    addService
);

folioPrefix.addEventListener(
    "input",
    updateFolioPreview
);

backupButton.addEventListener(
    "click",
    downloadBackup
);

restoreButton.addEventListener(
    "click",
    () => {
        restoreFile.click();
    }
);

restoreFile.addEventListener(
    "change",
    handleRestoreFile
);

deleteOrdersButton.addEventListener(
    "click",
    requestDeleteOrders
);

closeConfirmButton.addEventListener(
    "click",
    closeConfirmModal
);

cancelConfirmButton.addEventListener(
    "click",
    closeConfirmModal
);

confirmActionButton.addEventListener(
    "click",
    executeConfirmAction
);

menuButton.addEventListener(
    "click",
    () => {
        if (
            sidebar.classList.contains(
                "open"
            )
        ) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
);

overlay.addEventListener(
    "click",
    () => {
        if (
            confirmModal.classList
                .contains(
                    "visible"
                )
        ) {
            closeConfirmModal();
            return;
        }

        closeSidebar();
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key !== "Escape"
        ) {
            return;
        }

        if (
            confirmModal.classList
                .contains(
                    "visible"
                )
        ) {
            closeConfirmModal();
            return;
        }

        closeSidebar();
    }
);


/* =====================================================
   FIRESTORE EN TIEMPO REAL
===================================================== */

window.addEventListener(
    "pisadabacana:orders-updated",
    event => {
        const firestoreOrders =
            event.detail?.orders;

        if (
            !Array.isArray(
                firestoreOrders
            )
        ) {
            return;
        }

        orders =
            firestoreOrders;

        renderDataSummary();
    }
);


window.addEventListener(
    "pisadabacana:settings-updated",
    event => {
        const firestoreSettings =
            event.detail?.settings;

        if (
            !firestoreSettings ||
            typeof firestoreSettings !==
                "object"
        ) {
            return;
        }

        settings =
            mergeSettings(
                firestoreSettings
            );

        /*
            No redibujamos mientras el usuario
            está escribiendo si el evento procede
            de nuestra misma escritura inmediatamente.
            Un pequeño defer evita conflictos de foco.
        */
        setTimeout(
            () => {
                renderSettingsForm();
                renderDataSummary();
            },
            0
        );
    }
);


/* =====================================================
   INICIO
===================================================== */

async function initialize() {
    setCurrentDate();

    /*
        Defaults mientras llega Firestore.
    */
    renderSettingsForm();
    renderDataSummary();

    try {
        await waitForFirestore();

        const [
            firestoreOrders,
            firestoreSettings
        ] =
            await Promise.all([
                getDatabase()
                    .getOrders(),

                getDatabase()
                    .getSettings()
            ]);

        orders =
            firestoreOrders;

        settings =
            mergeSettings(
                firestoreSettings
            );

        renderSettingsForm();
        renderDataSummary();

    } catch (error) {
        console.error(
            "Error cargando Ajustes:",
            error
        );

        showToast(
            "No se pudieron cargar los ajustes de Firebase.",
            true
        );
    }
}


initialize();