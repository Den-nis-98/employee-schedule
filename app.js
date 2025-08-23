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

// Проверка валидности никнейма
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Проверка валидности ФИО
function isValidFullname(fullname) {
    return fullname.trim().length >= 3;
}

// Показ сообщений пользователю
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

// Показ формы входа
function showLogin() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    }
}

// Показ формы регистрации
function showRegister() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

// Регистрация нового пользователя
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

// Автоматический вход после регистрации
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

// Вход пользователя
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

// Выход пользователя
async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    showAuth();
}

// Проверка авторизации
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

// Показать экран авторизации
function showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (authScreen && app) {
        authScreen.classList.remove('hidden');
        app.classList.add('hidden');
    }
}

// Показать основное приложение
function showApp() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (authScreen && app) {
        authScreen.classList.add('hidden');
        app.classList.remove('hidden');
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    if (!currentUser) return;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', currentUser.id)
            .single();

        const userName = document.getElementById('user-name');
        if (profile && userName) {
            userName.textContent = `${profile.full_name} (@${profile.username})`;
        } else if (userName) {
            const username = currentUser.email.split('@')[0];
            userName.textContent = `${username} (@${username})`;
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// --- Календарь ---

// Рендер календаря
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const currentMonth = document.getElementById('current-month');
    if (currentMonth) {
        currentMonth.textContent = new Date(year, month, 1).toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric'
        });
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const calendar = document.getElementById('calendar');
    if (!calendar) return;

    calendar.innerHTML = '';

    // Дни предыдущего месяца
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const day = createDayElement(prevMonthLastDay - i, 'other-month');
        calendar.appendChild(day);
    }

    // Дни текущего месяца
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const day = createDayElement(i, '', dateStr, today, year, month, i);
        calendar.appendChild(day);
    }

    // Дни следующего месяца
    const totalCells = 42;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        const day = createDayElement(i, 'other-month');
        calendar.appendChild(day);
    }
}

// Создание элемента дня
function createDayElement(dayNumber, additionalClass = '', dateStr = '', today = null, year = null, month = null, i = null) {
    const day = document.createElement('div');
    day.className = `day ${additionalClass}`;

    const dayNumberElement = document.createElement('div');
    dayNumberElement.className = 'day-number';
    dayNumberElement.textContent = dayNumber;

    const timeContainer = document.createElement('div');
    timeContainer.className = 'shift-time-container';

    day.appendChild(dayNumberElement);
    day.appendChild(timeContainer);

    if (dateStr) {
        day.dataset.date = dateStr;

        if (today && year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            day.classList.add('today');
        }

        const userShift = currentEvents.find(event =>
            event.date === dateStr && event.user_id === currentUser?.id
        );

        if (userShift) {
            day.classList.add('has-shift');

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

        day.addEventListener('click', () => showModal(dateStr));
    }

    return day;
}

// Загрузка смен пользователя
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

// Обновление статистики
function updateStats() {
    if (!currentUser) return;

    const userShifts = currentEvents.filter(event => event.user_id === currentUser.id);
    const shiftsCount = document.getElementById('shifts-count');

    if (shiftsCount) {
        shiftsCount.textContent = userShifts.length;
    }
}

// --- Модальное окно ---

// Показать модальное окно
function showModal(date) {
    if (!currentUser) return;

    const selectedDate = document.getElementById('selected-date');
    if (selectedDate) {
        selectedDate.textContent = new Date(date).toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    const existingShift = currentEvents.find(event =>
        event.date === date && event.user_id === currentUser.id
    );

    const startTime = document.getElementById('start-time');
    const endTime = document.getElementById('end-time');
    const deleteShift = document.getElementById('delete-shift');
    const shiftModal = document.getElementById('shift-modal');

    if (existingShift) {
        if (startTime) startTime.value = existingShift.start_time;
        if (endTime) endTime.value = existingShift.end_time;
        if (deleteShift) deleteShift.classList.remove('hidden');
    } else {
        if (startTime) startTime.value = '09:00';
        if (endTime) endTime.value = '18:00';
        if (deleteShift) deleteShift.classList.add('hidden');
    }

    if (shiftModal) {
        shiftModal.dataset.date = date;
        shiftModal.classList.remove('hidden');
    }
}

// Скрыть модальное окно
function hideModal() {
    const shiftModal = document.getElementById('shift-modal');
    if (shiftModal) {
        shiftModal.classList.add('hidden');
    }
}

// Сохранение смены
async function saveShiftHandler() {
    if (!currentUser) return;

    const shiftModal = document.getElementById('shift-modal');
    const startTime = document.getElementById('start-time');
    const endTime = document.getElementById('end-time');

    if (!shiftModal || !startTime || !endTime) return;

    const date = shiftModal.dataset.date;
    const start = startTime.value;
    const end = endTime.value;

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

// Удаление смены
async function deleteShiftHandler() {
    if (!currentUser) return;

    const shiftModal = document.getElementById('shift-modal');
    if (!shiftModal) return;

    const date = shiftModal.dataset.date;
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

// Загрузка всех смен
async function loadAllShifts() {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    try {
        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    username
                )
            `)
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0])
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        displayAllShifts(data || []);
    } catch (error) {
        console.error('Ошибка загрузки всех смен:', error);
    }
}

// Отображение всех смен
function displayAllShifts(shifts) {
    const allShiftsContainer = document.getElementById('all-shifts');
    allShiftsContainer.innerHTML = '';

    if (shifts.length === 0) {
        allShiftsContainer.innerHTML = '<p>Смены не найдены</p>';
        return;
    }

    shifts.forEach(shift => {
        const shiftElement = document.createElement('div');
        shiftElement.className = 'shift-item';

        const start = new Date(`2000-01-01T${shift.start_time}`);
        const end = new Date(`2000-01-01T${shift.end_time}`);
        const duration = (end - start) / (1000 * 60 * 60);

        shiftElement.innerHTML = `
            <strong>${shift.profiles?.full_name || 'Сотрудник'}</strong>
            <small>(@${shift.profiles?.username || 'unknown'})</small>
            <br>
            <small>${shift.date} | ${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}</small>
            <br>
            <small>Длительность: ${duration.toFixed(1)} часов</small>
        `;

        allShiftsContainer.appendChild(shiftElement);
    });
}

// --- Инициализация ---

// Инициализация обработчиков событий
function initEventListeners() {
    // Навигация по месяцам
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

    // Модальное окно
    document.querySelector('.close')?.addEventListener('click', hideModal);
    document.getElementById('cancel-shift')?.addEventListener('click', hideModal);
    document.getElementById('save-shift')?.addEventListener('click', saveShiftHandler);
    document.getElementById('delete-shift')?.addEventListener('click', deleteShiftHandler);

    // Переключение видов
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

    // Кнопки авторизации
    document.getElementById('login-button')?.addEventListener('click', login);
    document.getElementById('register-button')?.addEventListener('click', register);
    document.getElementById('show-register')?.addEventListener('click', showRegister);
    document.getElementById('show-login')?.addEventListener('click', showLogin);
    document.getElementById('logout-button')?.addEventListener('click', logout);
}

// Запуск приложения
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
