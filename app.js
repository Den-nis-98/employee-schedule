// Настройки Supabase (заполнишь позже)
const SUPABASE_URL = 'https://olzdllwagjkhnmtwcbet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semRsbHdhZ2praG5tdHdjYmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDc5MTQsImV4cCI6MjA3MTUyMzkxNH0.yRDXL5r72ieKXoh8FY44Xcqq8kSxdiJilo4HGvzBYhw';

// Создаем подключение
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Проверка валидности никнейма
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Проверка валидности ФИО
function isValidFullname(fullname) {
    return fullname.trim().length >= 3;
}

// Показ форм авторизации
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    hideMessage();
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    hideMessage();
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove('hidden');
}

function hideMessage() {
    document.getElementById('auth-message').classList.add('hidden');
}

// Регистрация (упрощенная версия)
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const fullname = document.getElementById('register-fullname').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

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

        // 1. Сначала регистрируем пользователя в Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                showMessage('Никнейм уже занят', 'error');
            } else {
                showMessage('Ошибка регистрации: ' + authError.message, 'error');
            }
            return;
        }

        if (!authData.user) {
            showMessage('Ошибка создания пользователя', 'error');
            return;
        }

        // 2. Ждем немного чтобы пользователь создался в системе
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Создаем профиль в отдельной таблице
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    username: username,
                    full_name: fullname,
                    email: email
                }
            ]);

        if (profileError) {
            showMessage('Ошибка создания профиля: ' + profileError.message, 'error');
            // Пробуем войти если профиль уже существует
            await loginAfterRegister(username, password);
            return;
        }

        showMessage('Регистрация успешна! Входим...', 'success');
        
        // Автоматически входим
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
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showMessage('Ошибка входа: ' + error.message, 'error');
        } else {
            checkAuth();
        }
    } catch (error) {
        showMessage('Ошибка: ' + error.message, 'error');
    }
}

// Вход
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    const email = `${username}@company.com`;

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showMessage('Неверный никнейм или пароль', 'error');
            return;
        }

        showMessage('Вход успешен!', 'success');
        setTimeout(() => checkAuth(), 1000);

    } catch (error) {
        showMessage('Ошибка: ' + error.message, 'error');
    }
}

// Остальные функции остаются без изменений (logout, checkAuth, loadUserData, addShift, loadShifts, deleteShift)

// Выход
async function logout() {
    await supabase.auth.signOut();
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

// Проверка авторизации
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        await loadUserData();
        await loadShifts();
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('user-name').textContent = `${profile.full_name} (@${profile.username})`;
        } else {
            // Если профиля нет, пробуем его создать
            const username = user.email.split('@')[0];
            const { error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        username: username,
                        full_name: username,
                        email: user.email
                    }
                ]);

            if (!error) {
                document.getElementById('user-name').textContent = `${username} (@${username})`;
            }
        }
    }
}

// Добавление смены
async function addShift() {
    const date = document.getElementById('shift-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    if (!date || !startTime || !endTime) {
        alert('Заполните все поля!');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Проверяем, нет ли уже смены на эту дату
    const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .single();

    if (existingShift) {
        alert('У вас уже есть смена на эту дату!');
        return;
    }

    const { error } = await supabase
        .from('shifts')
        .insert([{ 
            user_id: user.id,
            date: date, 
            start_time: startTime, 
            end_time: endTime 
        }]);

    if (error) {
        alert('Ошибка: ' + error.message);
    } else {
        loadShifts();
        document.getElementById('shift-date').value = '';
        document.getElementById('start-time').value = '';
        document.getElementById('end-time').value = '';
    }
}

// Загрузка смен
async function loadShifts() {
    const { data: { user } } = await supabase.auth.getUser();

    // Мои смены
    const { data: myShifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('date');

    // Все смены всех сотрудников
    const { data: allShifts } = await supabase
        .from('shifts')
        .select(`
            *,
            profiles (full_name, username)
        `)
        .order('date');

    // Показываем мои смены
    document.getElementById('my-shifts').innerHTML = myShifts && myShifts.length > 0 
        ? myShifts.map(shift => `
            <div class="shift my-shift">
                <strong>${shift.date}</strong><br>
                ${shift.start_time} - ${shift.end_time}
                <button onclick="deleteShift('${shift.id}')" class="delete-btn">✕</button>
            </div>
        `).join('')
        : '<p>У вас пока нет смен</p>';

    // Показываем общий график
    document.getElementById('all-shifts').innerHTML = allShifts && allShifts.length > 0 
        ? allShifts.map(shift => `
            <div class="shift">
                <strong>${shift.profiles?.full_name || 'Сотрудник'}</strong>
                <small>(@${shift.profiles?.username || 'unknown'})</small><br>
                ${shift.date}: ${shift.start_time} - ${shift.end_time}
            </div>
        `).join('')
        : '<p>Пока нет ни одной смены</p>';
}

// Удаление смены
async function deleteShift(shiftId) {
    if (!confirm('Удалить эту смену?')) return;

    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

    if (error) {
        alert('Ошибка удаления: ' + error.message);
    } else {
        loadShifts();
    }
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-fullname').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('shift-date').value = today;
});
