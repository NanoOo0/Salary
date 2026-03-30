const salaryForm = document.getElementById("salaryForm");
const clearBtn = document.getElementById("clearBtn");
const resultContent = document.getElementById("resultContent");
const themeToggle = document.getElementById("themeToggle");

const hoursWorkedInput = document.getElementById("hoursWorked");
const daysInMonthSelect = document.getElementById("daysInMonth");
const storeMboInput = document.getElementById("storeMbo");
const employeeMboInput = document.getElementById("employeeMbo");
const storeTurnoverInput = document.getElementById("storeTurnover");
const staffPlanInput = document.getElementById("staffPlan");
const positionSelect = document.getElementById("position");
const attestationsSelect = document.getElementById("attestations");

const HOURLY_RATES = {
    administrator: 228,
    administrator_1_month: 205,
    administrator_2_month: 216,
    opp: 162,
    cashier: 145,
    seller: 128
};

const STAFF_MBO_FUND_AT_100 = 22000;
const ADMIN_MBO_FUND_AT_100 = 40000;

const ADMIN_ATTESTATION_COEFFICIENTS = {
    0: 0,
    1: 0.5,
    2: 1,
    3: 1.5
};

const STAFF_ATTESTATION_COEFFICIENTS = {
    0: 0,
    1: 0.25,
    2: 0.85,
    3: 1.6
};

initTheme();

salaryForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = getFormData();

    if (!validateFormData(formData)) {
        return;
    }

    const calculation = calculateSalary(formData);
    renderResult(formData, calculation);
});

clearBtn.addEventListener("click", function () {
    salaryForm.reset();
    daysInMonthSelect.value = "31";
    attestationsSelect.value = "0";
    resultContent.textContent = "Заполните поля и нажмите «Рассчитать»";
});

themeToggle.addEventListener("click", toggleTheme);

function getFormData() {
    return {
        hoursWorked: parseFloat(hoursWorkedInput.value),
        daysInMonth: parseInt(daysInMonthSelect.value, 10),
        storeMbo: parseFloat(storeMboInput.value),
        employeeMbo: parseFloat(employeeMboInput.value),
        storeTurnover: parseFloat(storeTurnoverInput.value),
        staffPlan: parseInt(staffPlanInput.value, 10),
        position: positionSelect.value,
        attestations: parseInt(attestationsSelect.value, 10)
    };
}

function validateFormData(data) {
    if (
        Number.isNaN(data.hoursWorked) ||
        Number.isNaN(data.daysInMonth) ||
        Number.isNaN(data.storeMbo) ||
        Number.isNaN(data.employeeMbo) ||
        Number.isNaN(data.storeTurnover) ||
        Number.isNaN(data.staffPlan)
    ) {
        showError("Пожалуйста, заполните все числовые поля.");
        return false;
    }

    if (data.hoursWorked < 0) {
        showError("Кол-во часов не может быть меньше 0.");
        return false;
    }

    if (data.storeMbo < 0 || data.employeeMbo < 0) {
        showError("Проценты МБО не могут быть меньше 0.");
        return false;
    }

    if (data.storeTurnover < 0) {
        showError("Товарооборот не может быть меньше 0.");
        return false;
    }

    if (data.staffPlan < 1) {
        showError("Штатное расписание должно быть больше 0.");
        return false;
    }

    if (!data.position) {
        showError("Пожалуйста, выберите должность.");
        return false;
    }

    return true;
}

function calculateSalary(data) {
    const hourlyRate = HOURLY_RATES[data.position] || 0;
    const basePay = data.hoursWorked * hourlyRate;

    const isAdmin = isAdminPosition(data.position);
    const staffWithoutAdmin = Math.max(data.staffPlan - 1, 1);

    const mboBonus = isAdmin
        ? calculateAdminMboBonus(data)
        : calculateStaffMboBonus(data, staffWithoutAdmin);

    const turnoverBonus = isAdmin
        ? calculateAdminTurnoverBonus(data.storeTurnover)
        : calculateStaffTurnoverBonus(data);

    const attestationBonus = calculateAttestationBonus(data, isAdmin, staffWithoutAdmin);

    const totalSalary = basePay + mboBonus + turnoverBonus + attestationBonus;

    return {
        hourlyRate,
        basePay,
        mboBonus,
        turnoverBonus,
        attestationBonus,
        totalSalary,
        positionNormHours: getPositionNormHours(data.position, data.staffPlan, data.daysInMonth),
        linearStaffHours: getLinearStaffHours(data.staffPlan, data.daysInMonth)
    };
}

function calculateStaffMboBonus(data, staffWithoutAdmin) {
    const storeFund =
        ((STAFF_MBO_FUND_AT_100 * staffWithoutAdmin) / 100) * data.storeMbo;

    return (storeFund / 100) * data.employeeMbo;
}

function calculateAdminMboBonus(data) {
    return (((ADMIN_MBO_FUND_AT_100 / 100) * data.storeMbo) / 100) * data.employeeMbo;
}

function calculateAdminTurnoverBonus(storeTurnover) {
    return (storeTurnover / 100) * 0.1;
}

function calculateStaffTurnoverBonus(data) {
    const turnoverFund = (data.storeTurnover / 100) * 0.5;
    const linearStaffHours = getLinearStaffHours(data.staffPlan, data.daysInMonth);

    if (linearStaffHours <= 0) {
        return 0;
    }

    const bonusPerHour = turnoverFund / linearStaffHours;
    return bonusPerHour * data.hoursWorked;
}

function getLinearStaffHours(staffPlan, daysInMonth) {
    const oppHours = getPositionNormHours("opp", staffPlan, daysInMonth);
    const cashierHours = getPositionNormHours("cashier", staffPlan, daysInMonth);

    return roundTo2(oppHours + cashierHours);
}

function calculateAttestationBonus(data, isAdmin, staffWithoutAdmin) {
    if (!data.attestations || data.attestations === 0) {
        return 0;
    }

    const attestationBase = ((data.storeTurnover / 100) * 0.5) / staffWithoutAdmin;

    const coefficient = isAdmin
        ? (ADMIN_ATTESTATION_COEFFICIENTS[data.attestations] || 0)
        : (STAFF_ATTESTATION_COEFFICIENTS[data.attestations] || 0);

    return attestationBase * coefficient;
}

function getPositionNormHours(position, staffPlan, daysInMonth) {
    const adminHoursPerDayAtPlan4 = 176 / 31;
    const adminHoursPerDayAtPlan5 = 8 * 5 / 7;
    const cashierHoursPerDaySingle = 186 / 31;
    const oppHoursPerDay = 372 / 31;
    const sellerHoursPerDay = 186 / 31;

    if (staffPlan === 4) {
        switch (position) {
            case "administrator":
            case "administrator_1_month":
            case "administrator_2_month":
                return roundTo2(adminHoursPerDayAtPlan4 * daysInMonth);
            case "cashier":
                return roundTo2(cashierHoursPerDaySingle * daysInMonth);
            case "opp":
                return roundTo2(oppHoursPerDay * daysInMonth);
            case "seller":
                return roundTo2(sellerHoursPerDay * daysInMonth);
            default:
                return 0;
        }
    }

    if (staffPlan === 5) {
        switch (position) {
            case "administrator":
            case "administrator_1_month":
            case "administrator_2_month":
                return roundTo2(adminHoursPerDayAtPlan5 * daysInMonth);
            case "cashier":
                return roundTo2((cashierHoursPerDaySingle * 2) * daysInMonth);
            case "opp":
                return roundTo2(oppHoursPerDay * daysInMonth);
            case "seller":
                return roundTo2(sellerHoursPerDay * daysInMonth);
            default:
                return 0;
        }
    }

    switch (position) {
        case "administrator":
        case "administrator_1_month":
        case "administrator_2_month":
            return roundTo2(adminHoursPerDayAtPlan4 * daysInMonth);
        case "cashier":
            return roundTo2(cashierHoursPerDaySingle * daysInMonth);
        case "opp":
            return roundTo2(oppHoursPerDay * daysInMonth);
        case "seller":
            return roundTo2(sellerHoursPerDay * daysInMonth);
        default:
            return 0;
    }
}

function isAdminPosition(position) {
    return (
        position === "administrator" ||
        position === "administrator_1_month" ||
        position === "administrator_2_month"
    );
}

function showError(message) {
    resultContent.innerHTML = `<span class="error-text">${message}</span>`;
}

function getPositionLabel(positionValue) {
    const positionMap = {
        administrator: "Администратор",
        administrator_1_month: "Администратор 1 мес",
        administrator_2_month: "Администратор 2 мес",
        opp: "ОПП",
        cashier: "Кассир",
        seller: "Продавец"
    };

    return positionMap[positionValue] || positionValue;
}

function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value) + " ₽";
}

function roundTo2(value) {
    return Math.round(value * 100) / 100;
}

function renderResult(data, calculation) {
    resultContent.innerHTML = `
        <div class="result-layout">
            <div class="result-block">
                <h3 class="result-block-title">Основные данные</h3>
                <div class="result-line">
                    <span class="result-label">Должность</span>
                    <span class="result-value">${getPositionLabel(data.position)}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Часы сотрудника</span>
                    <span class="result-value">${data.hoursWorked}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Дней в месяце</span>
                    <span class="result-value">${data.daysInMonth}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Норма часов должности</span>
                    <span class="result-value">${calculation.positionNormHours}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Часы линейного персонала</span>
                    <span class="result-value">${calculation.linearStaffHours}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Ставка за час</span>
                    <span class="result-value">${formatMoney(calculation.hourlyRate)}</span>
                </div>
            </div>

            <div class="result-block">
                <h3 class="result-block-title">Оклад</h3>
                <div class="result-line">
                    <span class="result-label">Оплата за часы</span>
                    <span class="result-value">${formatMoney(calculation.basePay)}</span>
                </div>
            </div>

            <div class="result-block">
                <h3 class="result-block-title">Премии</h3>
                <div class="result-line">
                    <span class="result-label">Премия МБО</span>
                    <span class="result-value">${formatMoney(calculation.mboBonus)}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Премия от ТО</span>
                    <span class="result-value">${formatMoney(calculation.turnoverBonus)}</span>
                </div>
                <div class="result-line">
                    <span class="result-label">Премия аттестации</span>
                    <span class="result-value">${formatMoney(calculation.attestationBonus)}</span>
                </div>
            </div>

            <div class="result-total">
                <span class="result-total-label">Итоговая зарплата</span>
                <span class="result-total-value">${formatMoney(calculation.totalSalary)}</span>
            </div>
        </div>
    `;
}

function initTheme() {
    const savedTheme = localStorage.getItem("salaryCalcTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
    }

    updateThemeButton();
}

function toggleTheme() {
    document.body.classList.toggle("dark-theme");

    const isDark = document.body.classList.contains("dark-theme");
    localStorage.setItem("salaryCalcTheme", isDark ? "dark" : "light");

    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.body.classList.contains("dark-theme");
    themeToggle.textContent = isDark ? "☀️ Светлая тема" : "🌙 Тёмная тема";
}