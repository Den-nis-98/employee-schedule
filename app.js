// Настройки Supabase (заполнишь позже)
const SUPABASE_URL = 'https://olzdllwagjkhnmtwcbet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semRsbHdhZ2praG5tdHdjYmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDc5MTQsImV4cCI6MjA3MTUyMzkxNH0.yRDXL5r72ieKXoh8FY44Xcqq8kSxdiJilo4HGvzBYhw';


// Создаем подключение
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Проверка валидности никнейма (только латиница и цифры)
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Проверка валидности ФИО
function isValidFullname(fullname) {
    return fullname.trim().length >= 3 && /[а-яА-Яa-zA-Z]/.test(fullname);
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

// Регистрация
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
        showMessage('Никнейм должен содержать только латинские буквы, цифры и подчеркивание (3-20 символов)', 'error');
        return;
    }

    if (!isValidFullname(fullname)) {
        showMessage('ФИО должно содержать хотя бы 3 буквы', 'error');
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

    // Создаем email на основе никнейма
    const email = `${username}@company.com`;

    try {
        // Проверяем, свободен ли никнейм
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            showMessage('Этот никнейм уже занят', 'error');
            return;
        }

        // Регистрируем пользователя
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('already registered')) {
                showMessage('Пользователь с таким никнеймом уже существует', 'error');
            } else {
                showMessage('Ошибка регистрации: ' + error.message, 'error');
            }
            return;
        }

        // Создаем профиль пользователя
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    { 
                        id: data.user.id, 
                        username: username,
                        full_name: fullname,
                        email: email
                    }
                ]);

            if (profileError) {
                // Если ошибка при создании профиля, удаляем пользователя
                await supabase.auth.admin.deleteUser(data.user.id);
                showMessage('Ошибка создания профиля: ' + profileError.message, 'error');
                return;
            }

            showMessage('Регистрация успешна! Входим в систему...', 'success');
            
            // Автоматически входим после регистрации
            setTimeout(() => {
                loginAfterRegister(username, password);
            }, 2000);
        }
    } catch (error) {
        showMessage('Ошибка регистрации: ' + error.message, 'error');
    }
}

// Вход после регистрации
async function loginAfterRegister(username, password) {
    const email = `${username}@company.com`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showMessage('Ошибка входа: ' + error.message, 'error');
    } else {
        checkAuth();
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

    if (!isValidUsername(username)) {
        showMessage('Введите корректный никнейм', 'error');
        return;
    }

    // Создаем email на основе никнейма
    const email = `${username}@company.com`;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                showMessage('Неверный никнейм или пароль', 'error');
            } else {
                showMessage('Ошибка входа: ' + error.message, 'error');
            }
            return;
        }

        // Если вход успешен
        showMessage('Вход выполнен успешно!', 'success');
        setTimeout(() => {
            checkAuth();
        }, 1000);

    } catch (error) {
        showMessage('Ошибка входа: ' + error.message, 'error');
    }
}

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
        // Показываем приложение
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        
        // Загружаем данные пользователя
        await loadUserData();
        await loadShifts();
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Получаем профиль пользователя
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('user-name').textContent = `${profile.full_name} (@${profile.username})`;
        } else {
            document.getElementById('user-name').textContent = user.email;
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
        // Очищаем поля
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
    if (myShifts && myShifts.length > 0) {
        document.getElementById('my-shifts').innerHTML = myShifts.map(shift => `
            <div class="shift my-shift">
                <strong>${shift.date}</strong><br>
                ${shift.start_time} - ${shift.end_time}
                <button onclick="deleteShift('${shift.id}')" class="delete-btn">✕</button>
            </div>
        `).join('');
    } else {
        document.getElementById('my-shifts').innerHTML = '<p>У вас пока нет смен</p>';
    }

    // Показываем общий график
    if (allShifts && allShifts.length > 0) {
        document.getElementById('all-shifts').innerHTML = allShifts.map(shift => `
            <div class="shift">
                <strong>${shift.profiles?.full_name || 'Сотрудник'}</strong>
                <small>(@${shift.profiles?.username || 'unknown'})</small><br>
                ${shift.date}: ${shift.start_time} - ${shift.end_time}
            </div>
        `).join('');
    } else {
        document.getElementById('all-shifts').innerHTML = '<p>Пока нет ни одной смены</p>';
    }
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

// Запускаем проверку авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Очищаем поля форм при загрузке
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-fullname').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    
    // Устанавливаем сегодняшнюю дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('shift-date').value = today;
});
