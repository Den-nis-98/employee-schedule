// Настройки Supabase
const SUPABASE_URL = 'https://olzdllwagjkhnmtwcbet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semRsbHdhZ2praG5tdHdjYmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDc5MTQsImV4cCI6MjA3MTUyMzkxNH0.yRDXL5r72ieKXoh8FY44Xcqq8kSxdiJilo4HGvzBYhw';

// Создаем подключение
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальные переменные
let currentUser = null;
let currentDate = new Date();
let currentEvents = [];

// Проверка валидности никнейма
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Проверка валидности ФИО
function isValidFullname(fullname) {
    return fullname.trim().length >= 3;
}

// Показ сообщений
function showMessage(text, type) {
    const messageDiv = document.getElementById('auth-message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

// Показ форм авторизации
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

// Регистрация
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

        const { error: authError } = await supabase.auth.signUp({
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
                showMessage('Ошибка регистрации: ' + authError.message, 'error');
            }
            return;
        }

        showMessage('Регистрация успешна! Входим...', 'success');
        
        setTimeout(() => {
            loginAfterRegister(username, password);
        }, 2000);

    } catch (error) {
        showMessage('Ошибка: ' + error.message, 'error');
    }
}

// Вход после регистрации
async function loginAfterRegister(username, password) {
    const email = `${username}@company.com`;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showMessage('Ошибка входа: ' + error.message, 'error');
        } else {
            currentUser = data.user;
            checkAuth();
        }
    } catch (error) {
        showMessage('Ошибка: ' + error.message, 'error');
    }
}

// Вход
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
        setTimeout(() => checkAuth(), 1000);

    } catch (error) {
        showMessage('Ошибка: ' + error.message, 'error');
    }
}

// Выход
async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    showAuth();
}

// Проверка авторизации
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        showApp();
        await loadUserData();
        await loadShifts();
    } else {
        showAuth();
    }
}

// Показать экран авторизации
function showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (authScreen && app) {
        authScreen.classList.remove('hidden');
        app.classList.add('hidden');
    }
    initAuthEventListeners();
}

// Показать основное приложение
function showApp() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    if (authScreen && app) {
        authScreen.classList.add('hidden');
        app.classList.remove('hidden');
    }
    initAppEventListeners();
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

        if (profile) {
            const userName = document.getElementById('user-name');
            if (userName) {
                userName.textContent = `${profile.full_name} (@${profile.username})`;
            }
        } else {
            const username = currentUser.email.split('@')[0];
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    id: currentUser.id,
                    username: username,
                    full_name: username,
                    email: currentUser.email
                }]);

            if (!insertError) {
                const userName = document.getElementById('user-name');
                if (userName) {
                    userName.textContent = `${username} (@${username})`;
                }
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

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
        const day = document.createElement('div');
        day.className = 'day other-month';
        day.innerHTML = `<div class="day-number">${prevMonthLastDay - i}</div>`;
        calendar.appendChild(day);
    }

    // Дни текущего месяца
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const day = document.createElement('div');
        day.className = 'day';
        day.innerHTML = `<div class="day-number">${i}</div>`;
        day.dataset.date = dateStr;

        // Проверка на сегодня
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            day.classList.add('today');
        }

        // Проверка на наличие смены
        const userShift = currentEvents.find(event => 
            event.date === dateStr && event.user_id === currentUser?.id
        );
        
        if (userShift) {
            day.classList.add('has-shift');
            const startTime = userShift.start_time.substring(0, 5);
            const endTime = userShift.end_time.substring(0, 5);
            
            const shiftElement = document.createElement('div');
            shiftElement.className = 'day-shift';
            shiftElement.textContent = `${startTime}-${endTime}`;
            day.appendChild(shiftElement);
        }

        day.addEventListener('click', () => showModal(dateStr));
        calendar.appendChild(day);
    }

    // Дни следующего месяца
    const totalCells = 42;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'day other-month';
        day.innerHTML = `<div class="day-number">${i}</div>`;
        calendar.appendChild(day);
    }
}

// Загрузка смен
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
            console.error('Error loading shifts:', error);
            return;
        }

        currentEvents = data || [];
        updateStats();
        renderCalendar();
    } catch (error) {
        console.error('Error:', error);
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
        shiftModal.style.display = 'block';
    }
}

// Скрыть модальное окно
function hideModal() {
    const shiftModal = document.getElementById('shift-modal');
    if (shiftModal) {
        shiftModal.style.display = 'none';
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
        showMessage('Ошибка: ' + error.message, 'error');
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
        showMessage('Ошибка удаления: ' + error.message, 'error');
    }
}

// Инициализация обработчиков для авторизации
function initAuthEventListeners() {
    const loginBtn = document.getElementById('login-button');
    const registerBtn = document.getElementById('register-button');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    
    if (loginBtn) loginBtn.onclick = login;
    if (registerBtn) registerBtn.onclick = register;
    if (showRegisterBtn) showRegisterBtn.onclick = showRegister;
    if (showLoginBtn) showLoginBtn.onclick = showLogin;
}

// Инициализация обработчиков для приложения
function initAppEventListeners() {
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-shift');
    const saveBtn = document.getElementById('save-shift');
    const deleteBtn = document.getElementById('delete-shift');
    const personalViewBtn = document.getElementById('personal-view');
    const generalViewBtn = document.getElementById('general-view');
    const logoutBtn = document.getElementById('logout-button');
    
    if (prevMonthBtn) prevMonthBtn.onclick = () => navigateMonth(-1);
    if (nextMonthBtn) nextMonthBtn.onclick = () => navigateMonth(1);
    if (closeBtn) closeBtn.onclick = hideModal;
    if (cancelBtn) cancelBtn.onclick = hideModal;
    if (saveBtn) saveBtn.onclick = saveShiftHandler;
    if (deleteBtn) deleteBtn.onclick = deleteShiftHandler;
    if (personalViewBtn) personalViewBtn.onclick = switchToPersonalView;
    if (generalViewBtn) generalViewBtn.onclick = switchToGeneralView;
    if (logoutBtn) logoutBtn.onclick = logout;
}

// Навигация по месяцам
function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    const personalView = document.getElementById('personal-view');
    if (personalView && personalView.classList.contains('active')) {
        renderCalendar();
        loadShifts();
    } else {
        loadAllShifts();
    }
}

// Переключение на личный вид
function switchToPersonalView() {
    const personalView = document.getElementById('personal-view');
    const generalView = document.getElementById('general-view');
    const generalSchedule = document.getElementById('general-schedule');
    const calendarContainer = document.getElementById('calendar-container');
    
    if (personalView && generalView && generalSchedule && calendarContainer) {
        personalView.classList.add('active');
        generalView.classList.remove('active');
        generalSchedule.classList.add('hidden');
        calendarContainer.classList.remove('hidden');
        renderCalendar();
        loadShifts();
    }
}

// Переключение на общий вид
function switchToGeneralView() {
    const personalView = document.getElementById('personal-view');
    const generalView = document.getElementById('general-view');
    const generalSchedule = document.getElementById('general-schedule');
    const calendarContainer = document.getElementById('calendar-container');
    
    if (generalView && personalView && generalSchedule && calendarContainer) {
        generalView.classList.add('active');
        personalView.classList.remove('active');
        generalSchedule.classList.remove('hidden');
        calendarContainer.classList.add('hidden');
        loadAllShifts();
    }
}

// Загрузка всех смен (общий график)
async function loadAllShifts() {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    try {
        // Получаем смены
        const { data: shiftsData, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .lte('date', endOfMonth.toISOString().split('T')[0])
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (shiftsError) throw shiftsError;

        // Получаем профили
        const userIds = [...new Set(shiftsData.map(shift => shift.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .in('id', userIds);

        if (profilesError) throw profilesError;

        // Объединяем данные
        const shiftsWithProfiles = shiftsData.map(shift => {
            const profile = profilesData.find(p => p.id === shift.user_id);
            return {
                ...shift,
                profiles: profile || { full_name: 'Сотрудник', username: 'unknown' }
            };
        });

        displayAllShifts(shiftsWithProfiles);

    } catch (error) {
        console.error('Error loading all shifts:', error);
        const allShiftsContainer = document.getElementById('all-shifts');
        if (allShiftsContainer) {
            allShiftsContainer.innerHTML = '<p>Ошибка загрузки данных</p>';
        }
    }
}

// Отображение всех смен в общем графике
function displayAllShifts(shifts) {
    const allShiftsContainer = document.getElementById('all-shifts');
    if (!allShiftsContainer) return;
    
    allShiftsContainer.innerHTML = '';

    if (shifts.length === 0) {
        allShiftsContainer.innerHTML = '<p>Смены не найдены</p>';
        return;
    }

    const shiftsByDate = {};
    shifts.forEach(shift => {
        if (!shiftsByDate[shift.date]) {
            shiftsByDate[shift.date] = [];
        }
        shiftsByDate[shift.date].push(shift);
    });

    const sortedDates = Object.keys(shiftsByDate).sort();

    sortedDates.forEach(date => {
        const dateElement = document.createElement('div');
        dateElement.className = 'shift-date-group';
        
        const dateObj = new Date(date);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        
        dateElement.innerHTML = `<h4 class="shift-date-header">${formattedDate}</h4>`;
        
        shiftsByDate[date].forEach(shift => {
            const shiftElement = document.createElement('div');
            shiftElement.className = 'general-shift-item';
            
            const startTime = shift.start_time.substring(0, 5);
            const endTime = shift.end_time.substring(0, 5);
            
            shiftElement.innerHTML = `
                <span class="employee-name">${shift.profiles?.full_name || 'Сотрудник'}</span>
                <span class="shift-time">${startTime}-${endTime}</span>
            `;
            
            dateElement.appendChild(shiftElement);
        });
        
        allShiftsContainer.appendChild(dateElement);
    });
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Очистка полей формы
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const registerUsername = document.getElementById('register-username');
    const registerFullname = document.getElementById('register-fullname');
    const registerPassword = document.getElementById('register-password');
    const registerConfirm = document.getElementById('register-confirm');
    
    if (loginUsername) loginUsername.value = '';
    if (loginPassword) loginPassword.value = '';
    if (registerUsername) registerUsername.value = '';
    if (registerFullname) registerFullname.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerConfirm) registerConfirm.value = '';
    
    checkAuth();
});
});
