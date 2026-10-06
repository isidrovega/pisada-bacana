"use strict";

/* =====================================================
   STORAGE
===================================================== */

const ORDERS_STORAGE_KEY =
    "pisadaBacanaOrders";

const SETTINGS_STORAGE_KEY =
    "pisadaBacanaSettings";


/* =====================================================
   CONFIGURACIÓN POR DEFECTO
===================================================== */

const DEFAULT_SETTINGS = {

    business: {
        name: "Pisada Bacana",
        phone: "",
        address: "",
        instagram: "",
        message:
            "Gracias por confiar en Pisada Bacana."
    },

    services: [
        {
            id: "service-basic",
            name: "Lavado básico",
            price: 0,
            type: "Tenis"
        },
        {
            id: "service-deep",
            name: "Lavado profundo",
            price: 0,
            type: "Tenis"
        },
        {
            id: "service-restoration",
            name: "Restauración",
            price: 0,
            type: "Tenis"
        },
        {
            id: "service-cap",
            name: "Lavado de gorra",
            price: 0,
            type: "Gorra"
        }
    ],

    paymentMethods: {
        cash: true,
        transfer: true,
        card: false
    },

    orders: {
        folioPrefix: "PB",
        defaultDeliveryDays: 3,
        currency: "MXN",
        initialStatus: "Recibido"
    }

};


/* =====================================================
   ESTADO
===================================================== */

let settings =
    loadSettings();

let pendingConfirmAction =
    null;

let toastTimer =
    null;


/* =====================================================
   ELEMENTOS
===================================================== */

const sidebar =
    document.getElementById("sidebar");

const menuButton =
    document.getElementById("menuButton");

const overlay =
    document.getElementById("overlay");

const currentDate =
    document.getElementById("currentDate");

const navOrderCount =
    document.getElementById("navOrderCount");

const saveAllButton =
    document.getElementById("saveAllButton");


/* NEGOCIO */

const businessName =
    document.getElementById("businessName");

const businessPhone =
    document.getElementById("businessPhone");

const businessAddress =
    document.getElementById("businessAddress");

const businessInstagram =
    document.getElementById("businessInstagram");

const businessMessage =
    document.getElementById("businessMessage");


/* SERVICIOS */

const servicesList =
    document.getElementById("servicesList");

const addServiceButton =
    document.getElementById("addServiceButton");


/* PAGOS */

const paymentCash =
    document.getElementById("paymentCash");

const paymentTransfer =
    document.getElementById("paymentTransfer");

const paymentCard =
    document.getElementById("paymentCard");


/* PEDIDOS */

const folioPrefix =
    document.getElementById("folioPrefix");

const folioPreview =
    document.getElementById("folioPreview");

const defaultDeliveryDays =
    document.getElementById(
        "defaultDeliveryDays"
    );

const currency =
    document.getElementById("currency");

const initialStatus =
    document.getElementById("initialStatus");


/* DATOS */

const totalOrders =
    document.getElementById("totalOrders");

const totalClients =
    document.getElementById("totalClients");

const totalServices =
    document.getElementById("totalServices");

const totalValue =
    document.getElementById("totalValue");


/* RESPALDO */

const backupButton =
    document.getElementById("backupButton");

const restoreButton =
    document.getElementById("restoreButton");

const restoreFile =
    document.getElementById("restoreFile");


/* BORRAR */

const deleteOrdersButton =
    document.getElementById(
        "deleteOrdersButton"
    );


/* MODAL */

const confirmModal =
    document.getElementById("confirmModal");

const confirmTitle =
    document.getElementById("confirmTitle");

const confirmMessage =
    document.getElementById("confirmMessage");

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
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");


/* =====================================================
   STORAGE HELPERS
===================================================== */

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
            "Error cargando pedidos:",
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

            return cloneObject(
                DEFAULT_SETTINGS
            );

        }


        const parsed =
            JSON.parse(stored);


        return mergeSettings(
            parsed
        );

    } catch (error) {

        console.error(
            "Error cargando configuración:",
            error
        );


        return cloneObject(
            DEFAULT_SETTINGS
        );

    }

}


function saveSettings() {

    localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
    );

}


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
                typeof saved.business === "object"
                    ? saved.business
                    : {}
            )
        },

        services:
            Array.isArray(saved.services)
                ? saved.services
                : defaults.services,

        paymentMethods: {
            ...defaults.paymentMethods,
            ...(
                saved.paymentMethods &&
                typeof saved.paymentMethods === "object"
                    ? saved.paymentMethods
                    : {}
            )
        },

        orders: {
            ...defaults.orders,
            ...(
                saved.orders &&
                typeof saved.orders === "object"
                    ? saved.orders
                    : {}
            )
        }

    };

}


/* =====================================================
   UTILIDADES
===================================================== */

function formatMoney(value) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(
        Number(value) || 0
    );

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
        typeof window.crypto.randomUUID ===
            "function"
    ) {

        return window.crypto.randomUUID();

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


function getClientKey(order) {

    const phone =
        String(order.phone || "")
            .replace(/\D/g, "");


    if (phone) {
        return `phone:${phone}`;
    }


    return (
        "name:" +
        String(
            order.clientName || ""
        )
            .trim()
            .toLowerCase()
    );

}


function setCurrentDate() {

    currentDate.textContent =
        new Intl.DateTimeFormat(
            "es-MX",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        ).format(
            new Date()
        );

}


/* =====================================================
   CARGAR FORMULARIO
===================================================== */

function renderSettingsForm() {

    businessName.value =
        settings.business.name || "";

    businessPhone.value =
        settings.business.phone || "";

    businessAddress.value =
        settings.business.address || "";

    businessInstagram.value =
        settings.business.instagram || "";

    businessMessage.value =
        settings.business.message || "";


    paymentCash.checked =
        Boolean(
            settings.paymentMethods.cash
        );

    paymentTransfer.checked =
        Boolean(
            settings.paymentMethods.transfer
        );

    paymentCard.checked =
        Boolean(
            settings.paymentMethods.card
        );


    folioPrefix.value =
        settings.orders.folioPrefix ||
        "PB";


    defaultDeliveryDays.value =
        Number.isFinite(
            Number(
                settings.orders
                    .defaultDeliveryDays
            )
        )
            ? Number(
                settings.orders
                    .defaultDeliveryDays
            )
            : 3;


    currency.value =
        settings.orders.currency ||
        "MXN";


    initialStatus.value =
        settings.orders.initialStatus ||
        "Recibido";


    updateFolioPreview();

    renderServices();

}


/* =====================================================
   SERVICIOS
===================================================== */

function renderServices() {

    servicesList.innerHTML = "";


    if (
        !Array.isArray(
            settings.services
        ) ||
        settings.services.length === 0
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

                    removeService(
                        service.id
                    );

                }
            );


            servicesList.appendChild(
                row
            );

        }
    );

}


function addService() {

    settings.services.push({

        id: createId(),

        name: "Nuevo servicio",

        price: 0,

        type: "Tenis"

    });


    renderServices();

    renderDataSummary();


    const rows =
        servicesList.querySelectorAll(
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


        input.focus();
        input.select();

    }

}


function removeService(id) {

    const service =
        settings.services.find(
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

        action: () => {

            settings.services =
                settings.services.filter(
                    item =>
                        item.id !== id
                );


            saveSettings();

            renderServices();

            renderDataSummary();


            showToast(
                "Servicio eliminado."
            );

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
                    defaultDeliveryDays.value
                ) || 0,
                0
            ),
            90
        );


    settings.business = {

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
            businessInstagram.value
                .trim(),

        message:
            businessMessage.value
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


    /*
        Limpiamos servicios antes
        de guardar.
    */

    settings.services =
        settings.services
            .map(
                service => ({

                    id:
                        service.id ||
                        createId(),

                    name:
                        String(
                            service.name || ""
                        ).trim(),

                    price:
                        Math.max(
                            Number(
                                service.price || 0
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

function saveAllSettings() {

    collectFormSettings();

    saveSettings();

    renderServices();

    updateFolioPreview();

    renderDataSummary();


    showToast(
        "Ajustes guardados correctamente."
    );

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
   RESUMEN DE DATOS
===================================================== */

function renderDataSummary() {

    const orders =
        loadOrders();


    const active =
        orders.filter(
            order =>
                String(
                    order.status || ""
                ).toLowerCase() !==
                "entregado"
        );


    navOrderCount.textContent =
        active.length;


    totalOrders.textContent =
        orders.length;


    const clientKeys =
        new Set();


    orders.forEach(
        order => {

            const key =
                getClientKey(order);


            if (
                key !== "name:"
            ) {

                clientKeys.add(key);

            }

        }
    );


    totalClients.textContent =
        clientKeys.size;


    totalServices.textContent =
        Array.isArray(
            settings.services
        )
            ? settings.services.length
            : 0;


    const value =
        orders.reduce(
            (sum, order) =>
                sum +
                Number(
                    order.price || 0
                ),
            0
        );


    totalValue.textContent =
        formatMoney(value);

}


/* =====================================================
   RESPALDO
===================================================== */

function downloadBackup() {

    /*
        Guardamos primero cualquier
        modificación pendiente.
    */

    collectFormSettings();

    saveSettings();


    const backup = {

        app:
            "Pisada Bacana",

        version:
            1,

        exportedAt:
            new Date()
                .toISOString(),

        orders:
            loadOrders(),

        settings:
            settings

    };


    const json =
        JSON.stringify(
            backup,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
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


    const now =
        new Date();


    const fileDate = [
        now.getFullYear(),
        String(
            now.getMonth() + 1
        ).padStart(2, "0"),
        String(
            now.getDate()
        ).padStart(2, "0")
    ].join("-");


    link.href =
        url;

    link.download =
        `pisada-bacana-respaldo-${fileDate}.json`;


    document.body.appendChild(
        link
    );


    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );


    showToast(
        "Respaldo descargado."
    );

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

        restoreFile.value = "";

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
                        `El respaldo contiene ${backup.orders.length} pedidos. La información actual será reemplazada.`,

                    confirmText:
                        "Restaurar",

                    action: () => {

                        localStorage.setItem(
                            ORDERS_STORAGE_KEY,
                            JSON.stringify(
                                backup.orders
                            )
                        );


                        settings =
                            mergeSettings(
                                backup.settings
                            );


                        saveSettings();


                        renderSettingsForm();

                        renderDataSummary();


                        showToast(
                            "Respaldo restaurado correctamente."
                        );

                    }

                });

            } catch (error) {

                console.error(
                    "Error restaurando respaldo:",
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
            "Aplicación incorrecta."
        );

    }


    if (
        !Array.isArray(
            backup.orders
        )
    ) {

        throw new Error(
            "Pedidos inválidos."
        );

    }


    if (
        !backup.settings ||
        typeof backup.settings !==
            "object"
    ) {

        throw new Error(
            "Configuración inválida."
        );

    }

}


/* =====================================================
   BORRAR PEDIDOS
===================================================== */

function requestDeleteOrders() {

    const orders =
        loadOrders();


    if (
        orders.length === 0
    ) {

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
            `Se eliminarán permanentemente ${orders.length} pedidos, incluyendo pagos e historial de clientes. Esta acción no se puede deshacer.`,

        confirmText:
            "Eliminar todo",

        action: () => {

            localStorage.removeItem(
                ORDERS_STORAGE_KEY
            );


            renderDataSummary();


            showToast(
                "Todos los pedidos fueron eliminados."
            );

        }

    });

}


/* =====================================================
   MODAL DE CONFIRMACIÓN
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


    /*
        Si el menú móvil no está abierto,
        también cerramos el overlay.
    */

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


function executeConfirmAction() {

    if (
        typeof pendingConfirmAction !==
        "function"
    ) {

        closeConfirmModal();

        return;

    }


    /*
        Guardamos la función antes de
        cerrar porque closeConfirmModal
        limpia pendingConfirmAction.
    */

    const action =
        pendingConfirmAction;


    closeConfirmModal();


    action();

}


/* =====================================================
   SIDEBAR MÓVIL
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
        !confirmModal.classList.contains(
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
            confirmModal.classList.contains(
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
            confirmModal.classList.contains(
                "visible"
            )
        ) {

            closeConfirmModal();

            return;

        }


        closeSidebar();

    }
);


window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
            ORDERS_STORAGE_KEY
        ) {

            renderDataSummary();

        }


        if (
            event.key ===
            SETTINGS_STORAGE_KEY
        ) {

            settings =
                loadSettings();


            renderSettingsForm();

            renderDataSummary();

        }

    }
);


window.addEventListener(
    "pageshow",
    () => {

        settings =
            loadSettings();


        renderSettingsForm();

        renderDataSummary();

    }
);


/* =====================================================
   INICIO
===================================================== */

function initialize() {

    setCurrentDate();

    renderSettingsForm();

    renderDataSummary();

}


initialize();