// Настройки Supabase
const SUPABASE_URL = 'https://olzdllwagjkhnmtwcbet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semRsbHdhZ2praG5tdHdjYmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDc5MTQsImV4cCI6MjA3MTUyMzkxNH0.yRDXL5r72ieKXoh8FY44Xcqq8kSxdiJilo4HGvzBYhw';


// Создаем подключение
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!username || !email || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    // Регистрируем пользователя
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        showMessage('Ошибка: ' + error.message, 'error');
        return;
    }

    // Создаем профиль пользователя
    if (data.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: data.user.id, 
                    username: username 
                }
            ]);

        if (profileError) {
            showMessage('Ошибка создания профиля: ' + profileError.message, 'error');
            return;
        }

        showMessage('Регистрация успешна! Проверьте email для подтверждения', 'success');
        showLogin();
    }
}

// Вход
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        showMessage('Ошибка: ' + error.message, 'error');
        return;
    }

    // Если вход успешен, проверяем авторизацию
    checkAuth();
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
            .select('username')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('user-name').textContent = profile.username;
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
            profiles (username)
        `)
        .order('date');

    // Показываем мои смены
    if (myShifts && myShifts.length > 0) {
        document.getElementById('my-shifts').innerHTML = myShifts.map(shift => `
            <div class="shift my-shift">
                <strong>${shift.date}</strong><br>
                ${shift.start_time} - ${shift.end_time}
            </div>
        `).join('');
    } else {
        document.getElementById('my-shifts').innerHTML = '<p>У вас пока нет смен</p>';
    }

    // Показываем общий график
    if (allShifts && allShifts.length > 0) {
        document.getElementById('all-shifts').innerHTML = allShifts.map(shift => `
            <div class="shift">
                <strong>${shift.profiles.username}</strong><br>
                ${shift.date}: ${shift.start_time} - ${shift.end_time}
            </div>
        `).join('');
    } else {
        document.getElementById('all-shifts').innerHTML = '<p>Пока нет ни одной смены</p>';
    }
}

// Запускаем проверку авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Очищаем поля форм при загрузке
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
});
