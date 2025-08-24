// Настройки Supabase
const SUPABASE_URL = 'https://olzdllwagjkhnmtwcbet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semRsbHdhZ2praG5tdHdjYmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDc5MTQsImV4cCI6MjA3MTUyMzkxNH0.yRDXL5r72ieKXoh8FY44Xcqq8kSxdiJilo4HGvzBYhw';

// Инициализация клиента Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальные переменные
let currentUser = null;
let currentDate = new Date();
let currentEvents = [];

// --- Вспомогательные функции ---
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function isValidFullname(fullname) {
    return fullname.trim().length >= 3;
}

function showMessage(text, type = 'error') {
    const messageDiv = document.getElementById('auth-message');
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');

    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

// --- Авторизация ---
function showLogin() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    }
}

function showRegister() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

async function register() {
    const username = document.getElementById('register-username')?.value.trim();
    const fullname = document.getElementById('register-fullname')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirm = document.getElementById('register-confirm')?.value;

    if (!username || !fullname || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    if (!isValidUsername(username)) {
        showMessage('Никнейм: только латинские буквы, цифры и _ (3-20 символов)', 'error');
        return;
    }

    if (password !== confirm) {
        showMessage('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 4) {
        showMessage('Пароль должен быть не менее 4 символов', 'error');
        return;
    }

    const email = `${username}@company.com`;

    try {
        showMessage('Регистрация...', 'success');

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    full_name: fullname
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                showMessage('Никнейм уже занят', 'error');
            } else {
                showMessage(`Ошибка регистрации: ${authError.message}`, 'error');
            }
            return;
        }

        showMessage('Регистрация успешна! Входим...', 'success');
        setTimeout(() => loginAfterRegister(username, password), 2000);
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function loginAfterRegister(username, password) {
    const email = `${username}@company.com`;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showMessage(`Ошибка входа: ${error.message}`, 'error');
        } else {
            currentUser = data.user;
            await checkAuth();
        }
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function login() {
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!username || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    const email = `${username}@company.com`;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showMessage('Неверный никнейм или пароль', 'error');
            return;
        }

        currentUser = data.user;
        showMessage('Вход успешен!', 'success');
        await checkAuth();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    showAuth();
}

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Ошибка получения сессии:", error);
        showAuth();
        return;
    }

    if (session) {
        currentUser = session.user;
        showApp();
        await loadUserData();
        await loadShifts();
    } else {
        showAuth();
    }
}

// --- UI функции ---
function showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (authScreen && app) {
        authScreen.classList.remove('hidden');
        app.classList.add('hidden');
    }
}

function showApp() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (authScreen && app) {
        authScreen.classList.add('hidden');
        app.classList.remove('hidden');
    }
}

// --- Загрузка данных пользователя ---
async function loadUserData() {
    if (!currentUser) return;

    try {
        console.log("Загружаем данные для пользователя с ID:", currentUser.id);
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Ошибка загрузки профиля:', error);
            return;
        }

        console.log("Получен профиль:", profile);

        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            if (profile) {
                userNameElement.textContent = `${profile.full_name} (@${profile.username})`;
            } else {
                const username = currentUser.email.split('@')[0];
                userNameElement.textContent = `${username} (@${username})`;
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// --- Календарь ---
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const currentMonthElement = document.getElementById('current-month');
    if (currentMonthElement) {
        currentMonthElement.textContent = new Date(year, month, 1).toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric'
        });
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const calendarElement = document.getElementById('calendar');
    if (!calendarElement) return;

    calendarElement.innerHTML = '';

    // Дни предыдущего месяца
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const dayElement = createDayElement(prevMonthLastDay - i, 'other-month');
        calendarElement.appendChild(dayElement);
    }

    // Дни текущего месяца
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayElement = createDayElement(i, '', dateStr, today, year, month, i);
        calendarElement.appendChild(dayElement);
    }

    // Дни следующего месяца
    const totalCells = 42;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        const dayElement = createDayElement(i, 'other-month');
        calendarElement.appendChild(dayElement);
    }
}

function createDayElement(dayNumber, additionalClass = '', dateStr = '', today = null, year = null, month = null, i = null) {
    const dayElement = document.createElement('div');
    dayElement.className = `day ${additionalClass}`;

    const dayNumberElement = document.createElement('div');
    dayNumberElement.className = 'day-number';
    dayNumberElement.textContent = dayNumber;

    const timeContainer = document.createElement('div');
    timeContainer.className = 'shift-time-container';

    dayElement.appendChild(dayNumberElement);
    dayElement.appendChild(timeContainer);

    if (dateStr) {
        dayElement.dataset.date = dateStr;

        if (today && year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            dayElement.classList.add('today');
        }

        const userShift = currentEvents.find(event =>
            event.date === dateStr && event.user_id === currentUser?.id
        );

        if (userShift) {
            dayElement.classList.add('has-shift');

            const startTime = userShift.start_time.substring(0, 5);
            const endTime = userShift.end_time.substring(0, 5);

            const startElement = document.createElement('div');
            startElement.className = 'shift-time-start';
            startElement.textContent = startTime;

            const endElement = document.createElement('div');
            endElement.className = 'shift-time-end';
            endElement.textContent = endTime;

            timeContainer.appendChild(startElement);
            timeContainer.appendChild(endElement);
        }

        dayElement.addEventListener('click', () => showModal(dateStr));
    }

    return dayElement;
}

// --- Загрузка смен ---
async function loadShifts() {
    if (!currentUser) return;

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0]);

        if (error) {
            console.error('Ошибка загрузки смен:', error);
            return;
        }

        currentEvents = data || [];
        updateStats();
        renderCalendar();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function updateStats() {
    if (!currentUser) return;

    const userShifts = currentEvents.filter(event => event.user_id === currentUser.id);
    const shiftsCountElement = document.getElementById('shifts-count');

    if (shiftsCountElement) {
        shiftsCountElement.textContent = userShifts.length;
    }
}

// --- Модальное окно ---
function showModal(date) {
    if (!currentUser) return;

    const selectedDateElement = document.getElementById('selected-date');
    if (selectedDateElement) {
        selectedDateElement.textContent = new Date(date).toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    const existingShift = currentEvents.find(event =>
        event.date === date && event.user_id === currentUser.id
    );

    const startTimeElement = document.getElementById('start-time');
    const endTimeElement = document.getElementById('end-time');
    const deleteShiftElement = document.getElementById('delete-shift');
    const shiftModalElement = document.getElementById('shift-modal');

    if (existingShift) {
        if (startTimeElement) startTimeElement.value = existingShift.start_time;
        if (endTimeElement) endTimeElement.value = existingShift.end_time;
        if (deleteShiftElement) deleteShiftElement.classList.remove('hidden');
    } else {
        if (startTimeElement) startTimeElement.value = '09:00';
        if (endTimeElement) endTimeElement.value = '18:00';
        if (deleteShiftElement) deleteShiftElement.classList.add('hidden');
    }

    if (shiftModalElement) {
        shiftModalElement.dataset.date = date;
        shiftModalElement.classList.remove('hidden');
    }
}

function hideModal() {
    const shiftModalElement = document.getElementById('shift-modal');
    if (shiftModalElement) {
        shiftModalElement.classList.add('hidden');
    }
}

async function saveShiftHandler() {
    if (!currentUser) return;

    const shiftModalElement = document.getElementById('shift-modal');
    const startTimeElement = document.getElementById('start-time');
    const endTimeElement = document.getElementById('end-time');

    if (!shiftModalElement || !startTimeElement || !endTimeElement) return;

    const date = shiftModalElement.dataset.date;
    const start = startTimeElement.value;
    const end = endTimeElement.value;

    if (!start || !end) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    try {
        const existingShift = currentEvents.find(event =>
            event.date === date && event.user_id === currentUser.id
        );

        if (existingShift) {
            const { error } = await supabase
                .from('shifts')
                .update({
                    start_time: start,
                    end_time: end,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingShift.id);

            if (error) throw error;

            showMessage('Смена обновлена', 'success');
        } else {
            const { error } = await supabase
                .from('shifts')
                .insert({
                    user_id: currentUser.id,
                    date: date,
                    start_time: start,
                    end_time: end,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            showMessage('Смена добавлена', 'success');
        }

        hideModal();
        await loadShifts();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

async function deleteShiftHandler() {
    if (!currentUser) return;

    const shiftModalElement = document.getElementById('shift-modal');
    if (!shiftModalElement) return;

    const date = shiftModalElement.dataset.date;
    const existingShift = currentEvents.find(event =>
        event.date === date && event.user_id === currentUser.id
    );

    if (!existingShift) return;

    try {
        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', existingShift.id);

        if (error) throw error;

        showMessage('Смена удалена', 'success');
        hideModal();
        await loadShifts();
    } catch (error) {
        showMessage(`Ошибка удаления: ${error.message}`, 'error');
    }
}

// --- Общий график ---
async function loadAllShifts() {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    try {
        console.log("Загружаем все смены за период:", startOfMonth, endOfMonth);

        // 1. Загружаем все смены за месяц
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0])
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (shiftsError) {
            console.error('Ошибка загрузки смен:', shiftsError);
            return;
        }

        if (!shifts || shifts.length === 0) {
            console.log("Смены не найдены");
            displayAllShifts([]);
            return;
        }

        // 2. Получаем уникальные user_id из смен
        const userIds = [...new Set(shifts.map(shift => shift.user_id))];

        // 3. Загружаем профили для этих user_id
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .in('id', userIds);

        if (profilesError) {
            console.error('Ошибка загрузки профилей:', profilesError);
            return;
        }

        // 4. Объединяем смены с профилями
        const shiftsWithProfiles = shifts.map(shift => {
            const profile = profiles.find(p => p.id === shift.user_id);
            return {
                ...shift,
                profiles: profile || { full_name: 'Сотрудник', username: 'unknown' }
            };
        });

        console.log("Полученные смены с профилями:", shiftsWithProfiles);
        displayAllShifts(shiftsWithProfiles);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function displayAllShifts(shifts) {
    console.log("Отображаем смены:", shifts);

    const allShiftsContainer = document.getElementById('all-shifts');
    if (!allShiftsContainer) {
        console.error("Элемент all-shifts не найден!");
        return;
    }

    allShiftsContainer.innerHTML = '';

    if (!shifts || shifts.length === 0) {
        allShiftsContainer.innerHTML = '<p>Смены не найдены</p>';
        return;
    }

    shifts.forEach(shift => {
        try {
            const shiftElement = document.createElement('div');
            shiftElement.className = 'shift-item';

            // Приводим время к формату HH:MM:SS, если оно в другом формате
            let startTime = shift.start_time;
            let endTime = shift.end_time;

            if (!startTime.includes(':')) startTime = `${startTime}:00:00`;
            if (!endTime.includes(':')) endTime = `${endTime}:00:00`;

            // Убираем секунды, если они есть (например, "08:00:00" → "08:00")
            startTime = startTime.split(':').slice(0, 2).join(':');
            endTime = endTime.split(':').slice(0, 2).join(':');

            const start = new Date(`2000-01-01T${startTime}:00`);
            const end = new Date(`2000-01-01T${endTime}:00`);
            const duration = (end - start) / (1000 * 60 * 60);

            const fullName = shift.profiles?.full_name || 'Сотрудник';
            const username = shift.profiles?.username || 'unknown';

            shiftElement.innerHTML = `
                <div class="shift-header">
                    <strong>${fullName}</strong>
                    <small class="username">(@${username})</small>
                </div>
                <div class="shift-time">
                    <small>${shift.date} | ${startTime} - ${endTime}</small>
                </div>
                <div class="shift-duration">
                    <small>Длительность: ${duration.toFixed(1)} часов</small>
                </div>
            `;

            allShiftsContainer.appendChild(shiftElement);
        } catch (error) {
            console.error("Ошибка при отображении смены:", shift, error);
        }
    });
}


// --- Инициализация ---
function initEventListeners() {
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        loadShifts();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        loadShifts();
    });

    document.querySelector('.close')?.addEventListener('click', hideModal);
    document.getElementById('cancel-shift')?.addEventListener('click', hideModal);
    document.getElementById('save-shift')?.addEventListener('click', saveShiftHandler);
    document.getElementById('delete-shift')?.addEventListener('click', deleteShiftHandler);

    document.getElementById('personal-view')?.addEventListener('click', () => {
        document.getElementById('personal-view')?.classList.add('active');
        document.getElementById('general-view')?.classList.remove('active');
        document.getElementById('general-schedule')?.classList.add('hidden');
        loadShifts();
    });

    document.getElementById('general-view')?.addEventListener('click', () => {
        document.getElementById('general-view')?.classList.add('active');
        document.getElementById('personal-view')?.classList.remove('active');
        document.getElementById('general-schedule')?.classList.remove('hidden');
        loadAllShifts();
    });

    document.getElementById('login-button')?.addEventListener('click', login);
    document.getElementById('register-button')?.addEventListener('click', register);
    document.getElementById('show-register')?.addEventListener('click', showRegister);
    document.getElementById('show-login')?.addEventListener('click', showLogin);
    document.getElementById('logout-button')?.addEventListener('click', logout);
}

// --- Запуск приложения ---
document.addEventListener('DOMContentLoaded', async function() {
    initEventListeners();

    // Очистка полей формы
    document.getElementById('login-username')?.setAttribute('value', '');
    document.getElementById('login-password')?.setAttribute('value', '');
    document.getElementById('register-username')?.setAttribute('value', '');
    document.getElementById('register-fullname')?.setAttribute('value', '');
    document.getElementById('register-password')?.setAttribute('value', '');
    document.getElementById('register-confirm')?.setAttribute('value', '');

    // Проверка авторизации
    await checkAuth();
});
