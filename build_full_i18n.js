const fs = require('fs');
const path = require('path');

const RAW_DICTIONARY = {
    // Navigation
    nav_dashboard: { en: 'Dashboard', tr: 'Genel Bakış', de: 'Übersicht', es: 'Panel Principal', fr: 'Tableau de bord', it: 'Dashboard', ru: 'Главная', ko: '대시보드', ja: 'ダッシュボード', ar: 'لوحة التحكم' },
    nav_grades: { en: 'Grades', tr: 'Dersler / Notlar', de: 'Noten', es: 'Calificaciones', fr: 'Notes', it: 'Voti', ru: 'Оценки', ko: '성적 관리', ja: '成績', ar: 'الدرجات' },
    nav_deadlines: { en: 'Deadlines', tr: 'Sınavlar / Teslimler', de: 'Fristen', es: 'Fechas Límite', fr: 'Échéances', it: 'Scadenze', ru: 'Дедлайны', ko: '마감일 / 시험', ja: '締切・試験', ar: 'المواعيد' },
    nav_study_sessions: { en: 'Study Sessions', tr: 'Çalışma Takibi', de: 'Lernzeiten', es: 'Sesiones de Estudio', fr: 'Sessions d\'étude', it: 'Sessioni di Studio', ru: 'Учебные сессии', ko: '학습 세션', ja: '学習記録', ar: 'جلسات المذاكرة' },
    nav_group_projects: { en: 'Group Projects', tr: 'Grup Projeleri', de: 'Gruppenprojekte', es: 'Proyectos Grupales', fr: 'Projets de Groupe', it: 'Progetti di Gruppo', ru: 'Групповые проекты', ko: '그룹 프로젝트', ja: 'グループ課題', ar: 'مشاريع جماعية' },
    nav_settings: { en: 'Settings', tr: 'Ayarlar', de: 'Einstellungen', es: 'Configuración', fr: 'Paramètres', it: 'Impostazioni', ru: 'Настройки', ko: '설정', ja: '設定', ar: 'الإعدادات' },
    nav_logout: { en: 'Log Out', tr: 'Çıkış Yap', de: 'Abmelden', es: 'Cerrar Sesión', fr: 'Déconnexion', it: 'Disconnetti', ru: 'Выйти', ko: '로그아웃', ja: 'ログアウト', ar: 'تسجيل الخروج' },

    // Common Days & Calendar
    day_sun: { en: 'Sunday', tr: 'Pazar', de: 'Sonntag', es: 'Domingo', fr: 'Dimanche', it: 'Domenica', ru: 'Воскресенье', ko: '일요일', ja: '日曜日', ar: 'الأحد' },
    day_mon: { en: 'Monday', tr: 'Pazartesi', de: 'Montag', es: 'Lunes', fr: 'Lundi', it: 'Lunedì', ru: 'Понедельник', ko: '월요일', ja: '月曜日', ar: 'الاثنين' },
    day_tue: { en: 'Tuesday', tr: 'Salı', de: 'Dienstag', es: 'Martes', fr: 'Mardi', it: 'Martedì', ru: 'Вторник', ko: '화요일', ja: '火曜日', ar: 'الثلاثاء' },
    day_wed: { en: 'Wednesday', tr: 'Çarşamba', de: 'Mittwoch', es: 'Miércoles', fr: 'Mercredi', it: 'Mercoledì', ru: 'Среда', ko: '수요일', ja: '水曜日', ar: 'الأربعاء' },
    day_thu: { en: 'Thursday', tr: 'Perşembe', de: 'Donnerstag', es: 'Jueves', fr: 'Jeudi', it: 'Giovedì', ru: 'Четверг', ko: '목요일', ja: '木曜日', ar: 'الخميس' },
    day_fri: { en: 'Friday', tr: 'Cuma', de: 'Freitag', es: 'Viernes', fr: 'Vendredi', it: 'Venerdì', ru: 'Пятница', ko: '금요일', ja: '金曜日', ar: 'الجمعة' },
    day_sat: { en: 'Saturday', tr: 'Cumartesi', de: 'Samstag', es: 'Sábado', fr: 'Samedi', it: 'Sabato', ru: 'Суббота', ko: '토요일', ja: '土曜日', ar: 'السبت' },

    cal_mon: { en: 'Mon', tr: 'Pzt', de: 'Mo', es: 'Lun', fr: 'Lun', it: 'Lun', ru: 'Пн', ko: '월', ja: '月', ar: 'إث' },
    cal_tue: { en: 'Tue', tr: 'Sal', de: 'Di', es: 'Mar', fr: 'Mar', it: 'Mar', ru: 'Вт', ko: '화', ja: '火', ar: 'ثل' },
    cal_wed: { en: 'Wed', tr: 'Çar', de: 'Mi', es: 'Mié', fr: 'Mer', it: 'Mer', ru: 'Ср', ko: '수', ja: '水', ar: 'أر' },
    cal_thu: { en: 'Thu', tr: 'Per', de: 'Do', es: 'Jue', fr: 'Jeu', it: 'Gio', ru: 'Чт', ko: '목', ja: '木', ar: 'خم' },
    cal_fri: { en: 'Fri', tr: 'Cum', de: 'Fr', es: 'Vie', fr: 'Ven', it: 'Ven', ru: 'Пт', ko: '금', ja: '金', ar: 'جم' },
    cal_sat: { en: 'Sat', tr: 'Cmt', de: 'Sa', es: 'Sáb', fr: 'Sam', it: 'Sab', ru: 'Сб', ko: '토', ja: '土', ar: 'سب' },
    cal_sun: { en: 'Sun', tr: 'Paz', de: 'So', es: 'Dom', fr: 'Dim', it: 'Dom', ru: 'Вс', ko: '일', ja: '日', ar: 'أح' },

    // Generic Actions & Status Buttons
    btn_save: { en: 'Save', tr: 'Kaydet', de: 'Speichern', es: 'Guardar', fr: 'Enregistrer', it: 'Salva', ru: 'Сохранить', ko: '저장', ja: '保存', ar: 'حفظ' },
    btn_cancel: { en: 'Cancel', tr: 'İptal', de: 'Abbrechen', es: 'Cancelar', fr: 'Annuler', it: 'Annulla', ru: 'Отмена', ko: '취소', ja: 'キャンセル', ar: 'إلغاء' },
    btn_delete: { en: 'Delete', tr: 'Sil', de: 'Löschen', es: 'Eliminar', fr: 'Supprimer', it: 'Elimina', ru: 'Удалить', ko: '삭제', ja: '削除', ar: 'حذف' },
    btn_edit: { en: 'Edit', tr: 'Düzenle', de: 'Bearbeiten', es: 'Editar', fr: 'Modifier', it: 'Modifica', ru: 'Редактировать', ko: '수정', ja: '編集', ar: 'تعديل' },
    btn_close: { en: 'Close', tr: 'Kapat', de: 'Schließen', es: 'Cerrar', fr: 'Fermer', it: 'Chiudi', ru: 'Закрыть', ko: '닫기', ja: '閉じる', ar: 'إغلاق' },
    btn_reset: { en: 'Reset', tr: 'Sıfırla', de: 'Zurücksetzen', es: 'Restablecer', fr: 'Réinitialiser', it: 'Ripristina', ru: 'Сброс', ko: '초기화', ja: 'リセット', ar: 'إعادة ضبط' },
    btn_add: { en: 'Add', tr: 'Ekle', de: 'Hinzufügen', es: 'Añadir', fr: 'Ajouter', it: 'Aggiungi', ru: 'Добавить', ko: '추가', ja: '追加', ar: 'إضافة' },
    btn_filter: { en: 'Filter', tr: 'Filtrele', de: 'Filtern', es: 'Filtrar', fr: 'Filtrer', it: 'Filtra', ru: 'Фильтровать', ko: '필터', ja: '絞り込み', ar: 'تصفية' },
    btn_clear: { en: 'Clear', tr: 'Temizle', de: 'Leeren', es: 'Limpiar', fr: 'Effacer', it: 'Cancella', ru: 'Очистить', ko: '지우기', ja: 'クリア', ar: 'مسح' },
    btn_search: { en: 'Search', tr: 'Ara', de: 'Suchen', es: 'Buscar', fr: 'Rechercher', it: 'Cerca', ru: 'Поиск', ko: '검색', ja: '検索', ar: 'بحث' },
    btn_calculate: { en: 'Calculate', tr: 'Hesapla', de: 'Berechnen', es: 'Calcular', fr: 'Calculer', it: 'Calcola', ru: 'Рассчитать', ko: '계산하기', ja: '計算', ar: 'حساب' },
    btn_calculate_gpa: { en: '🎓 Calculate GPA', tr: '🎓 GNO Hesapla', de: '🎓 GPA berechnen', es: '🎓 Calcular GPA', fr: '🎓 Calculer le GPA', it: '🎓 Calcola Media', ru: '🎓 Рассчитать GPA', ko: '🎓 GPA 계산하기', ja: '🎓 GPAを計算', ar: '🎓 حساب المعدل' },
    btn_send_invite: { en: 'Send Invitation', tr: 'Davet Gönder', de: 'Einladung senden', es: 'Enviar Invitación', fr: 'Envoyer l\'invitation', it: 'Invia Invito', ru: 'Отправить приглашение', ko: '초대 보내기', ja: '招待を送信', ar: 'إرسال دعوة' },
    btn_clear_search: { en: 'Clear Search', tr: 'Aramayı Temizle', de: 'Suche löschen', es: 'Borrar Búsqueda', fr: 'Effacer la recherche', it: 'Cancella Ricerca', ru: 'Сбросить поиск', ko: '검색 초기화', ja: '検索をクリア', ar: 'مسح البحث' },
    btn_clear_filter: { en: 'Clear Filter', tr: 'Filtreyi Temizle', de: 'Filter löschen', es: 'Limpiar Filtro', fr: 'Effacer le filtre', it: 'Cancella Filtro', ru: 'Сбросить фильтр', ko: '필터 초기화', ja: 'フィルター解除', ar: 'مسح التصفية' },
    btn_prev: { en: 'Previous', tr: 'Önceki', de: 'Zurück', es: 'Anterior', fr: 'Précédent', it: 'Precedente', ru: 'Назад', ko: '이전', ja: '前へ', ar: 'السابق' },
    btn_next: { en: 'Next', tr: 'Sonraki', de: 'Weiter', es: 'Siguiente', fr: 'Suivant', it: 'Successivo', ru: 'Вперед', ko: '다음', ja: '次へ', ar: 'التالي' },
    btn_prev_day: { en: '← Previous Day', tr: '← Önceki Gün', de: '← Vorheriger Tag', es: '← Día Anterior', fr: '← Jour Précédent', it: '← Giorno Precedente', ru: '← Предыдущий день', ko: '← 이전 날', ja: '← 前の日', ar: '← اليوم السابق' },
    btn_goto_today: { en: 'Today', tr: 'Bugün', de: 'Heute', es: 'Hoy', fr: 'Aujourd\'hui', it: 'Oggi', ru: 'Сегодня', ko: '오늘', ja: '今日', ar: 'اليوم' },
    btn_done: { en: 'Done', tr: 'Bitti', de: 'Erledigt', es: 'Hecho', fr: 'Fait', it: 'Fatto', ru: 'Готово', ko: '완료', ja: '完了', ar: 'تم' },
    btn_download: { en: 'Download', tr: 'İndir', de: 'Herunterladen', es: 'Descargar', fr: 'Télécharger', it: 'Scarica', ru: 'Скачать', ko: '다운로드', ja: 'ダウンロード', ar: 'تنزيل' },
    btn_import: { en: 'Import', tr: 'İçe Aktar', de: 'Importieren', es: 'Importar', fr: 'Importer', it: 'Importa', ru: 'Импорт', ko: '가져오기', ja: 'インポート', ar: 'استيراد' },
    btn_export: { en: 'Export', tr: 'Dışa Aktar', de: 'Exportieren', es: 'Exportar', fr: 'Exporter', it: 'Esporta', ru: 'Экспорт', ko: '내보내기', ja: 'エクスポート', ar: 'تصدير' },
    common_loading: { en: 'Loading...', tr: 'Yükleniyor...', de: 'Laden...', es: 'Cargando...', fr: 'Chargement...', it: 'Caricamento...', ru: 'Загрузка...', ko: '로딩 중...', ja: '読み込み中...', ar: 'جار التحميل...' },

    // Status Tags
    status_overdue: { en: 'Overdue', tr: 'Gecikti', de: 'Überfällig', es: 'Atrasado', fr: 'En retard', it: 'In ritardo', ru: 'Просрочено', ko: '기한 초과', ja: '期限超過', ar: 'متأخر' },
    status_today: { en: 'Today!', tr: 'Bugün!', de: 'Heute!', es: '¡Hoy!', fr: 'Aujourd\'hui !', it: 'Oggi!', ru: 'Сегодня!', ko: '오늘!', ja: '今日！', ar: 'اليوم!' },
    status_days_left: { en: '{n} days left', tr: '{n} gün kaldı', de: 'Noch {n} Tage', es: 'Quedan {n} días', fr: 'Dans {n} jours', it: '{n} giorni rimasti', ru: 'Осталось {n} дн.', ko: '{n}일 남음', ja: '残り{n}日', ar: 'بقي {n} أيام' },
    status_completed: { en: 'Completed', tr: 'Tamamlandı', de: 'Abgeschlossen', es: 'Completado', fr: 'Terminé', it: 'Completato', ru: 'Завершено', ko: '완료됨', ja: '完了', ar: 'مكتمل' },
    status_pending: { en: 'Pending', tr: 'Bekliyor', de: 'Ausstehend', es: 'Pendiente', fr: 'En attente', it: 'In attesa', ru: 'Ожидает', ko: '대기 중', ja: '未完了', ar: 'قيد الانتظار' },
    status_in_progress: { en: 'In Progress', tr: 'Devam Ediyor', de: 'In Bearbeitung', es: 'En Progreso', fr: 'En Cours', it: 'In Corso', ru: 'В процессе', ko: '진행 중', ja: '進行中', ar: 'قيد التنفيذ' },

    // Landing & Auth
    landing_badge: { en: '🎓 Next-Gen Student Platform', tr: '🎓 Yeni Nesil Öğrenci Platformu', de: '🎓 Next-Gen Studentenplattform', es: '🎓 Plataforma Estudiantil de Nueva Generación', fr: '🎓 Plateforme Étudiante Nouvelle Génération', it: '🎓 Piattaforma Studenti Next-Gen', ru: '🎓 Студенческая платформа нового поколения', ko: '🎓 차세대 학생 학업 관리 플랫폼', ja: '🎓 次世代スチューデントプラットフォーム', ar: '🎓 منصة الطلاب من الجيل القادم' },
    landing_title: { en: 'Track, Achieve & Excel in Your Studies', tr: 'Derslerini Takip Et, Hedeflerine Ulaş', de: 'Verfolge, Erreiche & Übertreffe deine Studienziele', es: 'Monitorea, Logra y Destaca en tus Estudios', fr: 'Suivez, Réussissez et Excellez dans vos Études', it: 'Organizza, Raggiungi ed Eccelli nei tuoi Studi', ru: 'Отслеживайте успехи и достигайте академических вершин', ko: '학업 목표를 관리하고 탁월한 성취를 이루세요', ja: '学習を可視化し、目標を達成しよう', ar: 'تتبع دراستك وحقق أهدافك وتفوق أكاديمياً' },
    landing_subtitle: {
        en: 'The complete academic companion for courses, deadlines, grades, study sessions and AI-driven insights.',
        tr: 'Dersler, sınavlar, notlar, çalışma saatleri ve yapay zeka destekli rehberin tek bir yerde.',
        de: 'Der umfassende akademische Begleiter für Kurse, Fristen, Noten und KI-gestützte Einblicke.',
        es: 'Tu compañero académico integral para asignaturas, exámenes, calificaciones e IA.',
        fr: 'Le compagnon académique complet pour vos cours, échéances, notes et révisions IA.',
        it: 'Il compagno accademico per corsi, scadenze, voti, sessioni di studio e IA.',
        ru: 'Полный академический помощник для курсов, дедлайнов, оценок и ИИ-аналитики.',
        ko: '과목, 마감일, 성적, 학습 시간 및 AI 맞춤 분석을 위한 완벽한 학업 파트너.',
        ja: '科目、試験日程、成績、学習時間、AI学習支援を統合したオールインワンパートナー。',
        ar: 'رفيقك الأكاديمي الشامل للمقررات، والمواعيد، والدرجات، وجلسات المذاكرة والذكاء الاصطناعي.'
    },
    login_tab: { en: 'Sign In', tr: 'Giriş Yap', de: 'Anmelden', es: 'Iniciar Sesión', fr: 'Connexion', it: 'Accedi', ru: 'Вход', ko: '로그인', ja: 'ログイン', ar: 'تسجيل الدخول' },
    register_tab: { en: 'Create Account', tr: 'Kayıt Ol', de: 'Registrieren', es: 'Crear Cuenta', fr: 'Créer un Compte', it: 'Registrati', ru: 'Регистрация', ko: '회원가입', ja: '新規登録', ar: 'إنشاء حساب' },
    email_label: { en: 'Email Address', tr: 'E-posta Adresi', de: 'E-Mail-Adresse', es: 'Correo Electrónico', fr: 'Adresse E-mail', it: 'Indirizzo Email', ru: 'Электронная почта', ko: '이메일 주소', ja: 'メールアドレス', ar: 'البريد الإلكتروني' },
    email_placeholder: { en: 'student@university.edu', tr: 'ogrenci@universite.edu.tr', de: 'student@universitaet.de', es: 'estudiante@universidad.es', fr: 'etudiant@universite.fr', it: 'studente@universita.it', ru: 'student@university.ru', ko: 'student@univ.ac.kr', ja: 'student@university.ac.jp', ar: 'student@university.edu' },
    password_label: { en: 'Password', tr: 'Şifre', de: 'Passwort', es: 'Contraseña', fr: 'Mot de passe', it: 'Password', ru: 'Пароль', ko: '비밀번호', ja: 'パスワード', ar: 'كلمة المرور' },
    password_placeholder: { en: '••••••••', tr: '••••••••', de: '••••••••', es: '••••••••', fr: '••••••••', it: '••••••••', ru: '••••••••', ko: '••••••••', ja: '••••••••', ar: '••••••••' },
    name_label: { en: 'Full Name', tr: 'Ad Soyad', de: 'Vollständiger Name', es: 'Nombre Completo', fr: 'Nom Complet', it: 'Nome e Cognome', ru: 'Полное имя', ko: '이름', ja: '氏名', ar: 'الاسم الكامل' },
    name_placeholder: { en: 'John Doe', tr: 'Ahmet Yılmaz', de: 'Max Mustermann', es: 'Carlos García', fr: 'Jean Dupont', it: 'Mario Rossi', ru: 'Иван Иванов', ko: '홍길동', ja: '山田 太郎', ar: 'محمد علي' },
    dept_label: { en: 'Department / Major', tr: 'Bölüm', de: 'Fachbereich / Studiengang', es: 'Carrera / Especialidad', fr: 'Filière / Département', it: 'Corso di Laurea', ru: 'Факультет / Специальность', ko: '학과 / 전공', ja: '学部・学科', ar: 'القسم / التخصص' },
    dept_placeholder: { en: 'e.g. Computer Engineering', tr: 'örn. Bilgisayar Mühendisliği', de: 'z.B. Informatik', es: 'ej. Ingeniería Informática', fr: 'ex. Génie Informatique', it: 'es. Ingegneria Informatica', ru: 'напр. Компьютерная инженерия', ko: '예: 컴퓨터공학과', ja: '例: 情報工学科', ar: 'مثال: هندسة الحاسوب' },
    dept_computer_engineering: { en: 'Computer Engineering', tr: 'Bilgisayar Mühendisliği', de: 'Informatik', es: 'Ingeniería Informática', fr: 'Génie Informatique', it: 'Ingegneria Informatica', ru: 'Компьютерная инженерия', ko: '컴퓨터공학과', ja: 'コンピュータ工学', ar: 'هندسة الحاسوب' },
    login_btn: { en: 'Sign In to Portal', tr: 'Sisteme Giriş Yap', de: 'Im Portal anmelden', es: 'Entrar al Portal', fr: 'Se connecter au portail', it: 'Accedi al portale', ru: 'Войти в систему', ko: '포털 로그인', ja: 'ポータルにログイン', ar: 'الدخول إلى البوابة' },
    register_btn: { en: 'Create Account', tr: 'Hesap Oluştur', de: 'Konto erstellen', es: 'Crear Cuenta', fr: 'Créer un Compte', it: 'Crea Account', ru: 'Зарегистрироваться', ko: '회원가입 완료', ja: 'アカウント作成', ar: 'إنشاء الحساب' },
    auth_forgot_password_link: { en: 'Forgot Password?', tr: 'Parolamı Unuttum?', de: 'Passwort vergessen?', es: '¿Olvidaste tu contraseña?', fr: 'Mot de passe oublié ?', it: 'Password dimenticata?', ru: 'Забыли пароль?', ko: '비밀번호를 잊으셨나요?', ja: 'パスワードをお忘れですか？', ar: 'هل نسيت كلمة المرور؟' },
    auth_forgot_title: { en: 'Reset Password', tr: 'Şifremi Sıfırla', de: 'Passwort zurücksetzen', es: 'Restablecer Contraseña', fr: 'Réinitialiser le mot de passe', it: 'Reimposta Password', ru: 'Сброс пароля', ko: '비밀번호 재설정', ja: 'パスワードの再設定', ar: 'إعادة تعيين كلمة المرور' },
    auth_forgot_subtitle_step1: {
        en: 'Enter your registered email address to receive a 6-digit verification code.',
        tr: 'Kayıtlı e-posta adresinizi girin, 6 haneli doğrulama kodunu gönderelim.',
        de: 'Gib deine registrierte E-Mail-Adresse ein, um einen 6-stelligen Code zu erhalten.',
        es: 'Introduce tu correo para recibir un código de verificación de 6 dígitos.',
        fr: 'Entrez votre e-mail pour recevoir un code de vérification à 6 chiffres.',
        it: 'Inserisci la tua email per ricevere un codice di verifica a 6 cifre.',
        ru: 'Введите ваш email для получения 6-значного кода подтверждения.',
        ko: '6자리 인증번호를 받으실 등록된 이메일 주소를 입력하세요.',
        ja: '6桁の認証コードを受信するための登録メールアドレスを入力してください。',
        ar: 'أدخل بريدك الإلكتروني المسجل لتلقي رمز التحقق المكون من 6 أرقام.'
    },
    auth_forgot_subtitle_step2: {
        en: 'Enter the 6-digit code sent to your email and set your new password.',
        tr: 'E-postanıza gönderilen 6 haneli kodu girin ve yeni şifrenizi belirleyin.',
        de: 'Gib den 6-stelligen Code ein und lege ein neues Passwort fest.',
        es: 'Introduce el código de 6 dígitos y define tu nueva contraseña.',
        fr: 'Saisissez le code à 6 chiffres et définissez votre nouveau mot de passe.',
        it: 'Inserisci il codice a 6 cifre e imposta la nuova password.',
        ru: 'Введите 6-значный код из письма и установите новый пароль.',
        ko: '이메일로 전송된 6자리 코드를 입력하고 새 비밀번호를 설정하세요.',
        ja: 'メールに届いた6桁のコードを入力し、新しいパスワードを設定してください。',
        ar: 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك وحدد كلمة المرور الجديدة.'
    },
    auth_send_code_btn: { en: 'Send Verification Code', tr: 'Doğrulama Kodu Gönder', de: 'Code senden', es: 'Enviar Código de Verificación', fr: 'Envoyer le code', it: 'Invia Codice', ru: 'Отправить код подтверждения', ko: '인증 코드 전송', ja: '認証コードを送信', ar: 'إرسال رمز التحقق' },
    auth_code_label: { en: '6-Digit Verification Code', tr: '6 Haneli Doğrulama Kodu', de: '6-stelliger Bestätigungscode', es: 'Código de Verificación (6 dígitos)', fr: 'Code de vérification (6 chiffres)', it: 'Codice di Verifica a 6 Cifre', ru: '6-значный код подтверждения', ko: '6자리 인증 코드', ja: '6桁の認証コード', ar: 'رمز التحقق المكون من 6 أرقام' },
    auth_code_placeholder: { en: 'e.g. 849201', tr: 'örn. 849201', de: 'z.B. 849201', es: 'ej. 849201', fr: 'ex. 849201', it: 'es. 849201', ru: 'напр. 849201', ko: '예: 849201', ja: '例: 849201', ar: 'مثال: 849201' },
    auth_new_password_label: { en: 'New Password', tr: 'Yeni Şifre', de: 'Neues Passwort', es: 'Nueva Contraseña', fr: 'Nouveau Mot de Passe', it: 'Nuova Password', ru: 'Новый пароль', ko: '새 비밀번호', ja: '新しいパスワード', ar: 'كلمة المرور الجديدة' },
    auth_confirm_password_label: { en: 'Confirm New Password', tr: 'Yeni Şifreyi Onayla', de: 'Neues Passwort bestätigen', es: 'Confirmar Nueva Contraseña', fr: 'Confirmer le Nouveau Mot de Passe', it: 'Conferma Nuova Password', ru: 'Подтвердите новый пароль', ko: '새 비밀번호 확인', ja: '新しいパスワードの確認', ar: 'تأكيد كلمة المرور الجديدة' },
    auth_reset_btn: { en: 'Update Password', tr: 'Şifreyi Güncelle', de: 'Passwort aktualisieren', es: 'Actualizar Contraseña', fr: 'Mettre à jour le mot de passe', it: 'Aggiorna Password', ru: 'Обновить пароль', ko: '비밀번호 변경하기', ja: 'パスワードを更新', ar: 'تحديث كلمة المرور' },
    auth_passwords_mismatch: { en: 'Passwords do not match.', tr: 'Şifreler birbiriyle eşleşmiyor.', de: 'Passwörter stimmen nicht überein.', es: 'Las contraseñas no coinciden.', fr: 'Les mots de passe ne correspondent pas.', it: 'Le password non coincidono.', ru: 'Пароли не совпадают.', ko: '비밀번호가 일치하지 않습니다.', ja: 'パスワードが一致しません。', ar: 'كلمتا المرور غير متطابقتين.' },
    auth_code_sent_toast: { en: 'Verification code sent to your email.', tr: 'Doğrulama kodu e-postanıza gönderildi.', de: 'Bestätigungscode an deine E-Mail gesendet.', es: 'Código de verificación enviado a tu correo.', fr: 'Code de vérification envoyé à votre adresse e-mail.', it: 'Codice di verifica inviato alla tua email.', ru: 'Код подтверждения отправлен на вашу почту.', ko: '인증 코드가 이메일로 전송되었습니다.', ja: '認証コードをメールに送信しました。', ar: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' },
    auth_password_reset_success: { en: 'Password updated successfully! You can now log in.', tr: 'Şifreniz başarıyla güncellendi! Artık giriş yapabilirsiniz.', de: 'Passwort erfolgreich aktualisiert! Du kannst dich jetzt anmelden.', es: '¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.', fr: 'Mot de passe mis à jour avec succès ! Vous pouvez vous connecter.', it: 'Password aggiornata con successo! Ora puoi accedere.', ru: 'Пароль успешно обновлен! Теперь вы можете войти.', ko: '비밀번호가 성공적으로 변경되었습니다! 로그인하세요.', ja: 'パスワードが正常に更新されました！ログインしてください。', ar: 'تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.' },
    auth_resend_code: { en: 'Resend Code', tr: 'Tekrar Kod Gönder', de: 'Code erneut senden', es: 'Reenviar Código', fr: 'Renvoyer le code', it: 'Reinvia Codice', ru: 'Отправить повторно', ko: '코드 재전송', ja: '再送信', ar: 'إعادة إرسال الرمز' },
    auth_back_to_login: { en: 'Back to Login', tr: 'Giriş Ekranına Dön', de: 'Zurück zum Login', es: 'Volver a Iniciar Sesión', fr: 'Retour à la connexion', it: 'Torna al Login', ru: 'Назад ко входу', ko: '로그인으로 돌아가기', ja: 'ログインに戻る', ar: 'العودة لتسجيل الدخول' },
    auth_timer_expires: { en: 'Code expires in: {time}', tr: 'Kodun kalan geçerlilik süresi: {time}', de: 'Code gültig für: {time}', es: 'El código expira en: {time}', fr: 'Le code expire dans : {time}', it: 'Il codice scade tra: {time}', ru: 'Срок действия кода: {time}', ko: '코드 만료까지 남은 시간: {time}', ja: 'コード有効期限: {time}', ar: 'ينتهي الرمز خلال: {time}' },
    auth_change_email: { en: 'Change', tr: 'Değiştir', de: 'Ändern', es: 'Cambiar', fr: 'Modifier', it: 'Modifica', ru: 'Изменить', ko: '변경', ja: '変更', ar: 'تغيير' },
    auth_new_pass_ph: { en: 'At least 6 characters', tr: 'En az 6 karakter', de: 'Mindestens 6 Zeichen', es: 'Al menos 6 caracteres', fr: 'Au moins 6 caractères', it: 'Almeno 6 caratteri', ru: 'Не менее 6 символов', ko: '최소 6자 이상', ja: '6文字以上', ar: '6 أحرف على الأقل' },
    auth_confirm_pass_ph: { en: 'Re-enter new password', tr: 'Yeni şifreyi tekrar yazın', de: 'Neues Passwort wiederholen', es: 'Vuelve a escribir la contraseña', fr: 'Retapez le nouveau mot de passe', it: 'Reinserisci la nuova password', ru: 'Повторите новый пароль', ko: '새 비밀번호를 다시 입력하세요', ja: '新しいパスワードを再入力', ar: 'أعد كتابة كلمة المرور الجديدة' },
    auth_strength_weak: { en: 'Weak', tr: 'Zayıf', de: 'Schwach', es: 'Débil', fr: 'Faible', it: 'Debole', ru: 'Слабый', ko: '취약', ja: '弱い', ar: 'ضعيف' },
    auth_strength_medium: { en: 'Medium', tr: 'Orta', de: 'Mittel', es: 'Media', fr: 'Moyen', it: 'Media', ru: 'Средний', ko: '보통', ja: '普通', ar: 'متوسط' },
    auth_strength_strong: { en: 'Strong 💪', tr: 'Güçlü 💪', de: 'Stark 💪', es: 'Fuerte 💪', fr: 'Fort 💪', it: 'Forte 💪', ru: 'Надежный 💪', ko: '안전 💪', ja: '強力 💪', ar: 'قوي 💪' },
    auth_passwords_match: { en: '✓ Passwords match', tr: '✓ Şifreler eşleşiyor', de: '✓ Passwörter stimmen überein', es: '✓ Las contraseñas coinciden', fr: '✓ Les mots de passe correspondent', it: '✓ Le password corrispondono', ru: '✓ Пароли совпадают', ko: '✓ 비밀번호가 일치합니다', ja: '✓ パスワードが一致しています', ar: '✓ كلمتا المرور متطابقتان' },
    auth_passwords_dont_match: { en: '✗ Passwords do not match yet', tr: '✗ Şifreler henüz eşleşmiyor', de: '✗ Passwörter stimmen noch nicht überein', es: '✗ Las contraseñas aún no coinciden', fr: '✗ Les mots de passe ne correspondent pas encore', it: '✗ Le password non corrispondono ancora', ru: '✗ Пароли пока не совпадают', ko: '✗ 비밀번호가 아직 일치하지 않습니다', ja: '✗ パスワードがまだ一致していません', ar: '✗ كلمتا المرور غير متطابقتين بعد' },
    auth_code_expired_note: { en: '⚠️ Code has expired', tr: '⚠️ Kodun süresi doldu', de: '⚠️ Code ist abgelaufen', es: '⚠️ El código ha expirado', fr: '⚠️ Le code a expiré', it: '⚠️ Il codice è scaduto', ru: '⚠️ Срок действия кода истек', ko: '⚠️ 코드가 만료되었습니다', ja: '⚠️ コードの有効期限が切れました', ar: '⚠️ انتهت صلاحية الرمز' },
    auth_success_desc_login: { en: 'Your password has been updated. Please log in with your new password.', tr: 'Şifreniz güncellendi. Lütfen yeni şifrenizle giriş yapın.', de: 'Dein Passwort wurde aktualisiert. Bitte mit dem neuen Passwort anmelden.', es: 'Tu contraseña ha sido actualizada. Por favor, inicia sesión con tu nueva contraseña.', fr: 'Votre mot de passe a été mis à jour. Veuillez vous connecter avec votre nouveau mot de passe.', it: 'La tua password è stata aggiornata. Effettua l\'accesso con la nuova password.', ru: 'Ваш пароль обновлен. Пожалуйста, войдите с новым паролем.', ko: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.', ja: 'パスワードが更新されました。新しいパスワードでログインしてください。', ar: 'تم تحديث كلمة المرور. يرجى تسجيل الدخول بكلمة المرور الجديدة.' },
    auth_go_to_login_btn: { en: 'Go to Login ➔', tr: 'Giriş Yap ➔', de: 'Zum Login ➔', es: 'Ir a Iniciar Sesión ➔', fr: 'Aller à la connexion ➔', it: 'Vai al Login ➔', ru: 'Перейти ко входу ➔', ko: '로그인으로 이동 ➔', ja: 'ログイン画面へ ➔', ar: 'الانتقال إلى تسجيل الدخول ➔' },

    // Dashboard
    dash_title: { en: 'Dashboard', tr: 'Genel Bakış', de: 'Übersicht', es: 'Panel Principal', fr: 'Tableau de bord', it: 'Dashboard', ru: 'Панель управления', ko: '대시보드', ja: 'ダッシュボード', ar: 'لوحة التحكم' },
    dash_subtitle: {
        en: 'Welcome back! Here is your current academic performance and schedule overview.',
        tr: 'Tekrar hoş geldin! İşte akademik durumun ve çalışma takvimin.',
        de: 'Willkommen zurück! Hier ist deine Leistungs- und Terminübersicht.',
        es: '¡Bienvenido/a de nuevo! Aquí tienes tu rendimiento y calendario académico.',
        fr: 'Bon retour ! Voici vos performances et votre planning académique.',
        it: 'Bentornato! Ecco il riepilogo delle tue prestazioni e scadenze.',
        ru: 'С возвращением! Вот обзор вашей успеваемости и расписания.',
        ko: '환영합니다! 현재 학업 성취도와 일정 요약입니다.',
        ja: 'おかえりなさい！現在の学習進捗とスケジュールの概要です。',
        ar: 'مرحباً بعودتك! إليك ملخص لأدائك الأكاديمي وجدولك الدراسي.'
    },
    dash_total_courses: { en: 'Total Courses', tr: 'Kayıtlı Dersler', de: 'Gesamte Kurse', es: 'Cursos Totales', fr: 'Total des Cours', it: 'Totale Corsi', ru: 'Всего курсов', ko: '총 과목 수', ja: '総科目数', ar: 'إجمالي المقررات' },
    dash_total_exams: { en: 'Upcoming Exams', tr: 'Yaklaşan Sınavlar', de: 'Anstehende Prüfungen', es: 'Próximos Exámenes', fr: 'Examens à Venir', it: 'Prossimi Esami', ru: 'Предстоящие экзамены', ko: '예정된 시험', ja: '予定されている試験', ar: 'الاختبارات القادمة' },
    dash_total_study: { en: 'Total Study Time', tr: 'Toplam Çalışma', de: 'Gesamte Lernzeit', es: 'Tiempo Total de Estudio', fr: 'Temps Total d\'Étude', it: 'Tempo Totale di Studio', ru: 'Всего времени учебы', ko: '총 학습 시간', ja: '総学習時間', ar: 'إجمالي وقت المذاكرة' },
    dash_avg_gpa: { en: 'Cumulative GPA', tr: 'Genel Not Ortalaması', de: 'Gesamtnote (GPA)', es: 'Promedio Acumulado', fr: 'Moyenne Générale', it: 'Media Generale', ru: 'Средний балл (GPA)', ko: '누적 GPA', ja: '累積GPA', ar: 'المعدل التراكمي' },
    dash_daily_avg: { en: 'Daily Average', tr: 'Günlük Ortalama', de: 'Tagesdurchschnitt', es: 'Promedio Diario', fr: 'Moyenne Quotidienne', it: 'Media Giornaliera', ru: 'В среднем за день', ko: '일일 평균', ja: '1日平均', ar: 'المعدل اليومي' },
    dash_weekly_avg: { en: 'Weekly Average', tr: 'Haftalık Ortalama', de: 'Wochendurchschnitt', es: 'Promedio Semanal', fr: 'Moyenne Hebdomadaire', it: 'Media Settimanale', ru: 'В среднем за неделю', ko: '주간 평균', ja: '週間平均', ar: 'المعدل الأسبوعي' },
    dash_today: { en: 'Today', tr: 'Bugün', de: 'Heute', es: 'Hoy', fr: 'Aujourd\'hui', it: 'Oggi', ru: 'Сегодня', ko: '오늘', ja: '今日', ar: 'اليوم' },
    dash_last_7_days: { en: 'Last 7 days', tr: 'Son 7 gün', de: 'Letzte 7 Tage', es: 'Últimos 7 días', fr: '7 derniers jours', it: 'Ultimi 7 giorni', ru: 'За 7 дней', ko: '최근 7일', ja: '過去7日間', ar: 'آخر 7 أيام' },
    dash_study_by_course: { en: 'Study Time by Course', tr: 'Derse Göre Çalışma Süresi', de: 'Lernzeit nach Kurs', es: 'Tiempo por Curso', fr: 'Temps par Cours', it: 'Studio per Corso', ru: 'Время по курсам', ko: '과목별 학습 시간', ja: '科目別学習時間', ar: 'المذاكرة حسب المقرر' },
    dash_study_by_day: { en: 'Study Time by Day', tr: 'Güne Göre Çalışma Süresi', de: 'Lernzeit nach Wochentag', es: 'Tiempo por Día', fr: 'Temps par Jour', it: 'Studio per Giorno', ru: 'Время по дням', ko: '요일별 학습 시간', ja: '曜日別学習時間', ar: 'المذاكرة حسب اليوم' },
    dash_no_study_data: { en: 'No study data found.', tr: 'Çalışma verisi bulunamadı.', de: 'Keine Daten vorhanden.', es: 'Sin datos de estudio.', fr: 'Aucune donnée.', it: 'Nessun dato.', ru: 'Нет данных.', ko: '학습 데이터가 없습니다.', ja: 'データがありません。', ar: 'لا توجد بيانات.' },
    dash_total: { en: 'Total', tr: 'Toplam', de: 'Gesamt', es: 'Total', fr: 'Total', it: 'Totale', ru: 'Всего', ko: '총계', ja: '合計', ar: 'الإجمالي' },
    dash_nearest_deadline: { en: 'Nearest Deadline', tr: 'En Yakın Teslim', de: 'Nächste Frist', es: 'Próxima Fecha Límite', fr: 'Prochaine Échéance', it: 'Prossima Scadenza', ru: 'Ближайший дедлайн', ko: '가장 가까운 마감일', ja: '直近の締切', ar: 'أقرب موعد تسليم' },
    dash_no_deadlines: { en: 'No upcoming deadlines found.', tr: 'Yaklaşan teslim tarihi bulunamadı.', de: 'Keine anstehenden Fristen.', es: 'No hay entregas pendientes.', fr: 'Aucune échéance à venir.', it: 'Nessuna scadenza imminente.', ru: 'Нет предстоящих дедлайнов.', ko: '예정된 마감일이 없습니다.', ja: '直近の締切はありません。', ar: 'لا توجد مواعيد قادمة.' },
    dash_upcoming_10_days: { en: 'Upcoming (next 10 days)', tr: 'Yaklaşanlar (Önümüzdeki 10 gün)', de: 'Anstehend (nächste 10 Tage)', es: 'Próximos (10 días)', fr: 'À venir (10 prochains jours)', it: 'Prossimi (10 giorni)', ru: 'Ближайшие (10 дней)', ko: '예정 (앞으로 10일)', ja: '今後の締切 (10日以内)', ar: 'القادمة (خلال 10 أيام)' },
    dash_quick_reminders: { en: 'Quick Reminders', tr: 'Hızlı Hatırlatıcılar', de: 'Schnell-Erinnerungen', es: 'Recordatorios Rápidos', fr: 'Rappels Rapides', it: 'Promemoria Rapidi', ru: 'Быстрые напоминания', ko: '빠른 알림', ja: 'クイック通知', ar: 'تذكيرات سريعة' },
    dash_no_reminders: { en: 'No pending activities.', tr: 'Bekleyen hatırlatıcı yok.', de: 'Keine ausstehenden Aufgaben.', es: 'No hay actividades pendientes.', fr: 'Aucun rappel.', it: 'Nessun promemoria.', ru: 'Нет напоминаний.', ko: '대기 중인 활동이 없습니다.', ja: '通知はありません。', ar: 'لا توجد تذكيرات معلقة.' },
    dash_active_courses_label: { en: 'Active Courses', tr: 'Kayıtlı Dersler', de: 'Aktive Kurse', es: 'Cursos Activos', fr: 'Cours Actifs', it: 'Corsi Iscritti', ru: 'Текущие курсы', ko: '수강 과목', ja: '履修科目', ar: 'المقررات المسجلة' },
    dash_total_study_label: { en: 'Total Study', tr: 'Toplam Çalışma', de: 'Gesamte Lernzeit', es: 'Estudio Total', fr: 'Étude Totale', it: 'Studio Totale', ru: 'Всего учебы', ko: '총 학습 시간', ja: '総学習時間', ar: 'إجمالي المذاكرة' },
    dash_buddies_label: { en: 'Buddies', tr: 'Arkadaşlar', de: 'Lernpartner', es: 'Compañeros', fr: 'Camarades', it: 'Compagni', ru: 'Однокурсники', ko: '스터디 버디', ja: '仲間', ar: 'الزملاء' },
    dash_buddy_single: { en: 'Buddy', tr: 'Arkadaş', de: 'Lernpartner', es: 'Compañero', fr: 'Camarade', it: 'Compagno', ru: 'Однокурсник', ko: '버디', ja: '仲間', ar: 'زميل' },
    dash_buddy_plural: { en: 'Buddies', tr: 'Arkadaş', de: 'Lernpartner', es: 'Compañeros', fr: 'Camarades', it: 'Compagni', ru: 'Однокурсники', ko: '버디', ja: '仲間', ar: 'زملاء' },
    dash_streak_word: { en: 'streak', tr: 'gün seri', de: 'Serie', es: 'racha', fr: 'série', it: 'serie', ru: 'дн. серия', ko: '일 연속', ja: '日連続', ar: 'أيام متتالية' },
    dash_no_buddies_inline: { en: '👋 No buddies yet. Click to invite classmates & share streaks!', tr: '👋 Henüz arkadaş eklenmedi. Sınıf arkadaşlarını davet et ve serilerini paylaş!', de: '👋 Noch keine Lernpartner. Lade Freunde ein und teile Lernserien!', es: '👋 Aún no tienes compañeros. ¡Invita a amigos y comparte rachas!', fr: '👋 Aucun camarade pour le moment. Invitez vos amis et partagez vos séries !', it: '👋 Nessun compagno. Invita gli amici e condividi le serie!', ru: '👋 Пока нет однокурсников. Пригласите друзей и делитесь сериями!', ko: '👋 아직 버디가 없습니다. 친구를 초대하고 연속 기록을 공유하세요!', ja: '👋 まだ仲間がいません。友達を招待して記録を共有しましょう！', ar: '👋 لا يوجد زملاء بعد. قم بدعوة زملائك وشارك فترات المذاكرة!' },
    dash_streaks_rank: { en: 'Streaks & Rank', tr: 'Seri & Sıralama', de: 'Serie & Rang', es: 'Racha y Puesto', fr: 'Série & Rang', it: 'Serie & Grado', ru: 'Серия и рейтинг', ko: '연속 기록 및 순위', ja: '連続記録・順位', ar: 'السلسلة والترتيب' },
    dash_monthly_cal: { en: 'Monthly Calendar', tr: 'Aylık Takvim', de: 'Monatskalender', es: 'Calendario Mensual', fr: 'Calendrier Mensuel', it: 'Calendario Mensile', ru: 'Месячный календарь', ko: '월간 캘린더', ja: '月間カレンダー', ar: 'التقويم الشهري' },
    dash_add_to_cal: { en: 'Add to Calendar', tr: 'Takvime Aktar', de: 'Zum Kalender hinzufügen', es: 'Añadir al Calendario', fr: 'Ajouter au Calendrier', it: 'Aggiungi al Calendario', ru: 'Добавить в календарь', ko: '캘린더에 추가', ja: 'カレンダーに追加', ar: 'إضافة إلى التقويم' },
    dash_days_left: { en: '{n} days left', tr: '{n} gün kaldı', de: 'Noch {n} Tage', es: 'Quedan {n} días', fr: 'Dans {n} jours', it: '{n} giorni rimasti', ru: 'Осталось {n} дн.', ko: '{n}일 남음', ja: '残り{n}日', ar: 'بقي {n} أيام' },
    dash_day_left: { en: '1 day left', tr: '1 gün kaldı', de: '1 Tag übrig', es: '1 día restante', fr: '1 jour restant', it: '1 giorno rimasto', ru: 'Остался 1 день', ko: '1일 남음', ja: '残り1日', ar: 'بقي يوم واحد' },
    dash_tomorrow: { en: 'Tomorrow (1 day left)', tr: 'Yarın (1 gün kaldı)', de: 'Morgen (1 Tag übrig)', es: 'Mañana (1 día restante)', fr: 'Demain (1 jour restant)', it: 'Domani (1 giorno rimasto)', ru: 'Завтра (1 день)', ko: '내일 (1일 남음)', ja: '明日 (残り1日)', ar: 'غداً (بقي يوم واحد)' },
    dash_today_exclamation: { en: 'Today!', tr: 'Bugün!', de: 'Heute!', es: '¡Hoy!', fr: 'Aujourd\'hui !', it: 'Oggi!', ru: 'Сегодня!', ko: '오늘!', ja: '今日！', ar: 'اليوم!' },
    dash_overdue_days: { en: 'Overdue ({n}d ago)', tr: 'Gecikti ({n}g önce)', de: 'Überfällig (vor {n}T)', es: 'Atrasado (hace {n}d)', fr: 'En retard ({n}j)', it: 'In ritardo ({n}g fa)', ru: 'Просрочено ({n}д назад)', ko: '기한 초과 ({n}일 전)', ja: '期限超過 ({n}日前)', ar: 'متأخر (منذ {n} يوم)' },

    // Day Note Modal
    dash_add_note: { en: 'Add a note', tr: 'Not ekle', de: 'Notiz hinzufügen', es: 'Añadir nota', fr: 'Ajouter une note', it: 'Aggiungi nota', ru: 'Добавить заметку', ko: '메모 추가', ja: 'メモを追加', ar: 'إضافة ملاحظة' },
    dash_write_note_placeholder: { en: 'Write a note for this day...', tr: 'Bu gün için bir not yazın...', de: 'Notiz für diesen Tag schreiben...', es: 'Escribe una nota para este día...', fr: 'Écrire une note pour ce jour...', it: 'Scrivi una nota per questo giorno...', ru: 'Напишите заметку на этот день...', ko: '이 날짜에 대한 메모 작성...', ja: 'この日のメモを入力...', ar: 'اكتب ملاحظة لهذا اليوم...' },
    dash_save_note: { en: 'Save Note', tr: 'Notu Kaydet', de: 'Notiz speichern', es: 'Guardar Nota', fr: 'Enregistrer la note', it: 'Salva Nota', ru: 'Сохранить заметку', ko: '메모 저장', ja: 'メモを保存', ar: 'حفظ الملاحظة' },
    dash_no_records_day: { en: 'No deadlines or activities for this day.', tr: 'Bu gün için sınav veya görev bulunmuyor.', de: 'Keine Fristen oder Aufgaben für diesen Tag.', es: 'Sin entregas o actividades para este día.', fr: 'Aucune échéance pour ce jour.', it: 'Nessuna attività per questo giorno.', ru: 'Нет дедлайнов на этот день.', ko: '이 날짜에 예정된 마감일이 없습니다.', ja: 'この日の締切や予定はありません。', ar: 'لا توجد مواعيد تسليم أو مهام لهذا اليوم.' },

    // Grades / Courses Page
    courses_title: { en: 'Grades & Course Management', tr: 'Dersler ve Not Yönetimi', de: 'Noten & Kurse', es: 'Calificaciones y Cursos', fr: 'Notes & Gestion des Cours', it: 'Voti e Corsi', ru: 'Оценки и курсы', ko: '성적 및 과목 관리', ja: '成績と科目管理', ar: 'إدارة الدرجات والمقررات' },
    courses_subtitle: {
        en: 'Track your course grades, credit weights, and calculate semester GPA.',
        tr: 'Ders notlarını, kredi ağırlıklarını takip et ve dönem ortalamanı hesapla.',
        de: 'Verfolge Noten, Kreditgewichtungen und berechne deinen Semester-GPA.',
        es: 'Sigue tus notas, ponderación de créditos y calcula tu promedio.',
        fr: 'Suivez vos notes, coefficients et calculez votre GPA semestriel.',
        it: 'Traccia i voti, i crediti e calcola la tua media accademica.',
        ru: 'Отслеживайте оценки, кредиты и рассчитывайте средний балл.',
        ko: '과목 성적과 학점 가중치를 관리하고 학기 GPA를 계산하세요.',
        ja: '科目の成績と単位数を管理し、学期GPAを計算します。',
        ar: 'تتبع درجات مقرراتك وأوزان الساعات المعتمدة واحسب المعدل الفصلي.'
    },
    courses_add_heading: { en: 'Add Course', tr: 'Ders Ekle', de: 'Kurs hinzufügen', es: 'Añadir Curso', fr: 'Ajouter un Cours', it: 'Aggiungi Corso', ru: 'Добавить курс', ko: '과목 추가', ja: '科目を追加', ar: 'إضافة مقرر' },
    courses_term_class_label: { en: 'Academic Term & Class', tr: 'Akademik Dönem & Sınıf', de: 'Akademisches Semester & Klasse', es: 'Período Académico y Curso', fr: 'Période Académique & Niveau', it: 'Periodo Accademico & Anno', ru: 'Семестр и курс', ko: '학기 및 학년', ja: '学期・学年', ar: 'الفصل الدراسي والسنة' },
    courses_academic_year_label: { en: 'Academic Year', tr: 'Akademik Yıl', de: 'Studienjahr', es: 'Año Académico', fr: 'Année Académique', it: 'Anno Accademico', ru: 'Учебный год', ko: '학년도', ja: '年度', ar: 'العام الدراسي' },
    courses_class_year_label: { en: 'Class / Year', tr: 'Sınıf / Yıl', de: 'Klasse / Jahr', es: 'Curso / Año', fr: 'Classe / Année', it: 'Classe / Anno', ru: 'Курс', ko: '학년', ja: '学年', ar: 'السنة الدراسية' },
    courses_semester_term_label: { en: 'Semester / Term', tr: 'Dönem / Yarıyıl', de: 'Semester / Halbjahr', es: 'Semestre / Trimestre', fr: 'Semestre / Trimestre', it: 'Semestre', ru: 'Семестр', ko: '학기', ja: '学期', ar: 'الفصل' },
    courses_preview_label: { en: 'Preview:', tr: 'Önizleme:', de: 'Vorschau:', es: 'Vista previa:', fr: 'Aperçu :', it: 'Anteprima:', ru: 'Предпросмотр:', ko: '미리보기:', ja: 'プレビュー:', ar: 'معاينة:' },
    courses_year_placeholder: { en: 'e.g. 2026-2027', tr: 'örn. 2026-2027', de: 'z.B. 2026-2027', es: 'ej. 2026-2027', fr: 'ex. 2026-2027', it: 'es. 2026-2027', ru: 'напр. 2026-2027', ko: '예: 2026-2027', ja: '例: 2026-2027', ar: 'مثال: 2026-2027' },
    term_fall: { en: 'Fall Term', tr: 'Güz Dönemi', de: 'Herbstsemester', es: 'Semestre de Otoño', fr: 'Semestre d\'Automne', it: 'Semestre Autunnale', ru: 'Осенний семестр', ko: '가을 학기', ja: '秋学期', ar: 'فصل الخريف' },
    term_spring: { en: 'Spring Term', tr: 'Bahar Dönemi', de: 'Frühlingssemester', es: 'Semestre de Primavera', fr: 'Semestre de Printemps', it: 'Semestre Primaverile', ru: 'Весенний семестр', ko: '봄 학기', ja: '春学期', ar: 'فصل الربيع' },
    term_summer: { en: 'Summer Term', tr: 'Yaz Dönemi', de: 'Sommersemester', es: 'Semestre de Verano', fr: 'Semestre d\'Été', it: 'Semestre Estivo', ru: 'Летний семестр', ko: '여름 학기', ja: '夏学期', ar: 'فصل الصيف' },
    term_unassigned: { en: 'No Term Assigned', tr: 'Atanmamış Dönem', de: 'Kein Semester zugewiesen', es: 'Sin Período Asignado', fr: 'Sans Période Assignée', it: 'Nessun Periodo Assegnato', ru: 'Без указания семестра', ko: '지정된 학기 없음', ja: '未設定の学期', ar: 'فصل غير محدد' },
    grade_1st: { en: '1st Grade', tr: '1. Sınıf', de: '1. Jahrgang', es: '1.er Curso', fr: '1ère Année', it: '1° Anno', ru: '1 курс', ko: '1학년', ja: '1年生', ar: 'السنة الأولى' },
    grade_2nd: { en: '2nd Grade', tr: '2. Sınıf', de: '2. Jahrgang', es: '2.º Curso', fr: '2ème Année', it: '2° Anno', ru: '2 курс', ko: '2학년', ja: '2年生', ar: 'السنة الثانية' },
    grade_3rd: { en: '3rd Grade', tr: '3. Sınıf', de: '3. Jahrgang', es: '3.er Curso', fr: '3ème Année', it: '3° Anno', ru: '3 курс', ko: '3학년', ja: '3年生', ar: 'السنة الثالثة' },
    grade_4th: { en: '4th Grade', tr: '4. Sınıf', de: '4. Jahrgang', es: '4.º Curso', fr: '4ème Année', it: '4° Anno', ru: '4 курс', ko: '4학년', ja: '4年生', ar: 'السنة الرابعة' },
    grade_prep: { en: 'Prep Year', tr: 'Hazırlık', de: 'Vorbereitungsjahr', es: 'Año Preparatorio', fr: 'Année Préparatoire', it: 'Anno Preparatorio', ru: 'Подготовительный год', ko: '어학/예비과정', ja: '準備コース', ar: 'السنة التحضيرية' },
    grade_masters: { en: 'Master\'s / Graduate', tr: 'Yüksek Lisans / Mezun', de: 'Master / Absolvent', es: 'Máster / Graduado', fr: 'Master / Diplômé', it: 'Master / Laureato', ru: 'Магистратура / Выпускник', ko: '석사 / 대학원', ja: '修士 / 大学院', ar: 'ماجستير / دراسات عليا' },
    grade_phd: { en: 'PhD / Doctorate', tr: 'Doktora', de: 'Promotion / PhD', es: 'Doctorado / PhD', fr: 'Doctorat / PhD', it: 'Dottorato / PhD', ru: 'Аспирантура / PhD', ko: '박사 과정', ja: '博士課程', ar: 'دكتوراه' },
    grade_student: { en: 'Student', tr: 'Öğrenci', de: 'Student', es: 'Estudiante', fr: 'Étudiant', it: 'Studente', ru: 'Студент', ko: '학생', ja: '学生', ar: 'طالب' },
    grade_other: { en: 'Other', tr: 'Diğer', de: 'Sonstiges', es: 'Otro', fr: 'Autre', it: 'Altro', ru: 'Другое', ko: '기타', ja: 'その他', ar: 'أخرى' },
    courses_result_pass: { en: 'Pass', tr: 'Geçti', de: 'Bestanden', es: 'Aprobado', fr: 'Admis', it: 'Superato', ru: 'Сдано', ko: '합격', ja: '合格', ar: 'ناجح' },
    courses_result_fail: { en: 'Fail', tr: 'Kaldı', de: 'Nicht bestanden', es: 'Suspenso', fr: 'Ajourné', it: 'Respinto', ru: 'Не сдано', ko: '불합격', ja: '不合格', ar: 'راسب' },
    courses_req_passing: { en: '✓ Passing', tr: '✓ Geçiyor', de: '✓ Bestanden', es: '✓ Aprobando', fr: '✓ Réussi', it: '✓ Promosso', ru: '✓ Сдает', ko: '✓ 통과', ja: '✓ 合格見込', ar: '✓ ناجح' },
    courses_req_impossible: { en: '✗ Impossible', tr: '✗ İmkansız', de: '✗ Unerreichbar', es: '✗ Imposible', fr: '✗ Impossible', it: '✗ Impossibile', ru: '✗ Невозможно', ko: '✗ 달성 불가', ja: '✗ 達成不可', ar: '✗ غير ممكن' },
    courses_req_enter_weights: { en: 'Enter weights', tr: 'Ağırlıkları girin', de: 'Gewichtungen eingeben', es: 'Introduce ponderaciones', fr: 'Entrez les coefficients', it: 'Inserisci pesi', ru: 'Укажите веса', ko: '가중치를 입력하세요', ja: '配点割合を入力', ar: 'أدخل الأوزان' },
    courses_course_single: { en: 'course', tr: 'ders', de: 'Kurs', es: 'curso', fr: 'cours', it: 'corso', ru: 'курс', ko: '개 과목', ja: '科目', ar: 'مقرر' },
    courses_course_plural: { en: 'courses', tr: 'ders', de: 'Kurse', es: 'cursos', fr: 'cours', it: 'corsi', ru: 'курсов', ko: '개 과목', ja: '科目', ar: 'مقررات' },
    courses_calc_already_passed: { en: '✅ You already passed!', tr: '✅ Zaten geçtiniz!', de: '✅ Du hast bereits bestanden!', es: '✅ ¡Ya has aprobado!', fr: '✅ Vous avez déjà validé !', it: '✅ Hai già superato il corso!', ru: '✅ Вы уже сдали курс!', ko: '✅ 이미 통과했습니다!', ja: '✅ すでに合格基準に達しています！', ar: '✅ لقد نجحت بالفعل!' },
    courses_calc_impossible: { en: '❌ Passing is not possible even with 100 on the final.', tr: '❌ Finalden 100 alsanız dahi geçmek mümkün değil.', de: '❌ Bestehen auch mit 100 im Abschluss nicht möglich.', es: '❌ Imposible aprobar incluso con 100 en el final.', fr: '❌ Impossible de valider même avec 100 au final.', it: '❌ Impossibile superare anche con 100 al finale.', ru: '❌ Сдать невозможно даже со 100 баллами на итоговом.', ko: '❌ 기말고사에서 100점을 맞아도 통과가 불가능합니다.', ja: '❌ 期末試験で100点を取っても合格基準に達しません。', ar: '❌ لا يمكن النجاح حتى مع الحصول على 100 في الاختبار النهائي.' },
    courses_calc_invalid_weights: { en: '⚠️ Invalid weights. Total weights cannot exceed 100%.', tr: '⚠️ Geçersiz ağırlıklar. Toplam ağırlık %100\'ü geçemez.', de: '⚠️ Ungültige Gewichtungen. Gesamt darf 100% nicht übersteigen.', es: '⚠️ Ponderaciones inválidas. El total no puede exceder 100%.', fr: '⚠️ Coefficients invalides. Le total ne peut pas dépasser 100%.', it: '⚠️ Pesi non validi. Il totale non può superare il 100%.', ru: '⚠️ Некорректный вес. Сумма не может превышать 100%.', ko: '⚠️ 잘못된 가중치입니다. 총 가중치는 100%를 초과할 수 없습니다.', ja: '⚠️ 配点割合が無効です。合計が100%を超過することはできません。', ar: '⚠️ الأوزان غير صالحة. لا يمكن أن يتجاوز مجموع الأوزان 100%.' },
    courses_calc_enter_prompt: { en: 'Enter at least one grade to calculate.', tr: 'Hesaplama için en az bir not girin.', de: 'Gib mindestens eine Note ein.', es: 'Introduce al menos una nota para calcular.', fr: 'Entrez au moins une note pour calculer.', it: 'Inserisci almeno un voto.', ru: 'Введите хотя бы одну оценку.', ko: '계산하려면 최소 하나의 성적을 입력하세요.', ja: '計算するには少なくとも1つの点数を入力してください。', ar: 'أدخل درجة واحدة على الأقل للحساب.' },
    courses_calc_need_score: { en: '📝 You need at least {score} on the final.', tr: '📝 Finalden en az {score} almanız gerekiyor.', de: '📝 Du benötigst mindestens {score} im Abschluss.', es: '📝 Necesitas al menos {score} en el final.', fr: '📝 Vous devez obtenir au moins {score} au final.', it: '📝 Devi ottenere almeno {score} al finale.', ru: '📝 Вам нужно минимум {score} на итоговом экзамене.', ko: '📝 기말고사에서 최소 {score}점을 받아야 합니다.', ja: '📝 期末試験で最低 {score}点 必要です。', ar: '📝 تحتاج إلى {score} على الأقل في الاختبار النهائي.' },
    courses_name_placeholder: { en: 'Course Name (e.g. Database Systems)', tr: 'Ders Adı (örn. Veri Yapıları)', de: 'Kursname (z.B. Datenbanksysteme)', es: 'Nombre de Asignatura (ej. Bases de Datos)', fr: 'Nom du cours (ex. Systèmes de bases de données)', it: 'Nome Corso (es. Basi di Dati)', ru: 'Название курса (напр. Базы данных)', ko: '과목명 (예: 데이터베이스)', ja: '科目名 (例: データベース)', ar: 'اسم المقرر (مثال: قواعد البيانات)' },
    courses_instructor_placeholder: { en: 'Instructor Name', tr: 'Öğretim Görevlisi Adı', de: 'Dozentenname', es: 'Nombre del Profesor', fr: 'Nom de l\'Enseignant', it: 'Docente', ru: 'Преподаватель', ko: '교수명', ja: '担当教員名', ar: 'اسم المدرس' },
    courses_credits: { en: 'Credits', tr: 'Kredi', de: 'Credits / ECTS', es: 'Créditos', fr: 'Crédits', it: 'Crediti', ru: 'Кредиты', ko: '학점', ja: '単位数', ar: 'الساعات المعتمدة' },
    courses_midterm_placeholder: { en: 'Midterm grade', tr: 'Vize notu', de: 'Zwischenprüfungsnote', es: 'Nota parcial', fr: 'Note de partiel', it: 'Voto parziale', ru: 'Оценка за коллоквиум', ko: '중간고사 성적', ja: '中間試験の点数', ar: 'درجة الاختبار النصفي' },
    courses_project_placeholder: { en: 'Project grade (optional)', tr: 'Proje notu (isteğe bağlı)', de: 'Projekt-Note (optional)', es: 'Nota de proyecto (opcional)', fr: 'Note de projet (optionnel)', it: 'Voto progetto (opzionale)', ru: 'Оценка за проект (опц.)', ko: '프로젝트 성적 (선택)', ja: '課題・レポート点 (任意)', ar: 'درجة المشروع (اختياري)' },
    courses_final_placeholder: { en: 'Final grade', tr: 'Final notu', de: 'Abschlussnote', es: 'Nota final', fr: 'Note finale', it: 'Voto finale', ru: 'Итоговая оценка', ko: '기말고사 성적', ja: '期末試験の点数', ar: 'درجة الاختبار النهائي' },
    courses_makeup_placeholder: { en: 'Makeup grade (optional)', tr: 'Büt notu (isteğe bağlı)', de: 'Nachprüfungsnote (optional)', es: 'Nota extraordinaria (opcional)', fr: 'Note de rattrapage (optionnel)', it: 'Voto recupero (opzionale)', ru: 'Оценка за пересдачу (опц.)', ko: '재시험 성적 (선택)', ja: '再試験の点数 (任意)', ar: 'درجة الاختبار التكميلي (اختياري)' },
    courses_midterm_weight_label: { en: 'Midterm Weight (%)', tr: 'Vize Ağırlığı (%)', de: 'Gewichtung Zwischenprüfung (%)', es: 'Ponderación Parcial (%)', fr: 'Poids Partiel (%)', it: 'Peso Parziale (%)', ru: 'Вес промежуточного (%)', ko: '중간고사 가중치 (%)', ja: '中間割合 (%)', ar: 'وزن النصفي (%)' },
    courses_midterm_weight_placeholder: { en: 'e.g. 40', tr: 'örn. 40', de: 'z.B. 40', es: 'ej. 40', fr: 'ex. 40', it: 'es. 40', ru: 'напр. 40', ko: '예: 40', ja: '例: 40', ar: 'مثال: 40' },
    courses_project_weight_label: { en: 'Project Weight (%)', tr: 'Proje Ağırlığı (%)', de: 'Gewichtung Projekt (%)', es: 'Ponderación Proyecto (%)', fr: 'Poids Projet (%)', it: 'Peso Progetto (%)', ru: 'Вес проекта (%)', ko: '프로젝트 가중치 (%)', ja: '課題割合 (%)', ar: 'وزن المشروع (%)' },
    courses_project_weight_placeholder: { en: '0 if no project', tr: 'Proje yoksa 0', de: '0 wenn kein Projekt', es: '0 si no hay proyecto', fr: '0 si pas de projet', it: '0 se non c\'è progetto', ru: '0 если нет проекта', ko: '프로젝트 없으면 0', ja: '課題なしなら0', ar: '0 إذا لم يكن هناك مشروع' },
    courses_passing_grade_label: { en: 'Passing Grade', tr: 'Geçme Notu', de: 'Bestehensgrenze', es: 'Nota de Aprobado', fr: 'Seuil de Réussite', it: 'Voto Minimo', ru: 'Проходной балл', ko: '통과 기준 점수', ja: '合格基準点', ar: 'درجة النجاح' },
    courses_extra_grades_label: { en: 'Other Graded Items (optional)', tr: 'Diğer Notlandırmalar (isteğe bağlı)', de: 'Weitere Notenbestandteile (optional)', es: 'Otras Evaluaciones (opcional)', fr: 'Autres Évaluations (optionnel)', it: 'Altre Valutazioni (opzionale)', ru: 'Другие оценки (опционально)', ko: '기타 평가 항목 (선택)', ja: 'その他評価項目 (任意)', ar: 'تقييمات أخرى (اختياري)' },
    courses_extra_item_placeholder: { en: 'e.g. Homework, Quiz', tr: 'örn. Ödev, Quiz', de: 'z.B. Hausaufgabe, Quiz', es: 'ej. Tarea, Quiz', fr: 'ex. Devoir, Quiz', it: 'es. Compito, Quiz', ru: 'напр. ДЗ, тест', ko: '예: 과제, 퀴즈', ja: '例: 宿題、小テスト', ar: 'مثال: واجب، اختبار قصير' },
    courses_extra_weight_placeholder: { en: 'Weight %', tr: 'Ağırlık %', de: 'Gewicht %', es: 'Ponderación %', fr: 'Poids %', it: 'Peso %', ru: 'Вес %', ko: '가중치 %', ja: '割合 %', ar: 'الوزن %' },
    courses_extra_score_placeholder: { en: 'Score', tr: 'Not', de: 'Note', es: 'Puntuación', fr: 'Note', it: 'Punteggio', ru: 'Балл', ko: '점수', ja: '点数', ar: 'الدرجة' },
    courses_add_extra_btn: { en: '+ Add Grade Item', tr: '+ Not Kalemi Ekle', de: '+ Notenbestandteil hinzufügen', es: '+ Añadir Evaluación', fr: '+ Ajouter une Évaluation', it: '+ Aggiungi Valutazione', ru: '+ Добавить пункт оценки', ko: '+ 평가 항목 추가', ja: '+ 評価項目を追加', ar: '+ إضافة بند تقييم' },
    courses_save_btn: { en: 'Save Course', tr: 'Dersi Kaydet', de: 'Kurs speichern', es: 'Guardar Curso', fr: 'Enregistrer le Cours', it: 'Salva Corso', ru: 'Сохранить курс', ko: '과목 저장', ja: '科目を保存', ar: 'حفظ المقرر' },
    courses_search_heading: { en: '🔍 Search Courses', tr: '🔍 Dersleri Ara', de: '🔍 Kurse durchsuchen', es: '🔍 Buscar Cursos', fr: '🔍 Rechercher des Cours', it: '🔍 Cerca Corsi', ru: '🔍 Поиск курсов', ko: '🔍 과목 검색', ja: '🔍 科目を検索', ar: '🔍 بحث عن مقررات' },
    courses_search_placeholder: { en: 'Search by name, instructor, grade...', tr: 'Ders adı, hoca veya nota göre ara...', de: 'Nach Name, Dozent oder Note suchen...', es: 'Buscar por nombre, profesor o nota...', fr: 'Rechercher par nom, enseignant ou note...', it: 'Cerca per nome, docente o voto...', ru: 'Поиск по названию, преподавателю...', ko: '과목명, 교수명, 성적으로 검색...', ja: '科目名、教員名、点数で検索...', ar: 'بحث بالاسم، المدرس أو الدرجة...' },
    courses_filter_term: { en: 'Filter by Term:', tr: 'Döneme Göre Filtrele:', de: 'Nach Semester filtern:', es: 'Filtrar por Período:', fr: 'Filtrer par Semestre:', it: 'Filtra per Periodo:', ru: 'Фильтр по семестрам:', ko: '학기별 필터:', ja: '学期で絞り込み:', ar: 'تصفية حسب الفصل:' },
    courses_missing_final: { en: 'Missing Final', tr: 'Finali Eksik', de: 'Fehlende Abschlussnote', es: 'Sin Nota Final', fr: 'Sans Note Finale', it: 'Manca Finale', ru: 'Без итоговой', ko: '기말 미응시', ja: '期末未入力', ar: 'النهائي غير مسجل' },
    courses_low_midterm: { en: 'Low Midterm (<50)', tr: 'Düşük Vize (<50)', de: 'Niedrige Zwischenprüfung (<50)', es: 'Parcial Bajo (<50)', fr: 'Partiel Faible (<50)', it: 'Parziale Basso (<50)', ru: 'Низкий балл (<50)', ko: '낮은 중간고사 (<50)', ja: '中間点数低 (<50)', ar: 'نصفي منخفض (<50)' },
    courses_high_midterm: { en: 'High Midterm (≥80)', tr: 'Yüksek Vize (≥80)', de: 'Hohe Zwischenprüfung (≥80)', es: 'Parcial Alto (≥80)', fr: 'Partiel Élevé (≥80)', it: 'Parziale Alto (≥80)', ru: 'Высокий балл (≥80)', ko: '높은 중간고사 (≥80)', ja: '中間点数高 (≥80)', ar: 'نصفي مرتفع (≥80)' },
    courses_gpa_heading: { en: '🎓 GPA Calculator', tr: '🎓 GNO Hesaplayıcı', de: '🎓 GPA-Rechner', es: '🎓 Calculadora de GPA', fr: '🎓 Calculateur de GPA', it: '🎓 Calcolatore Media', ru: '🎓 Калькулятор GPA', ko: '🎓 GPA 계산기', ja: '🎓 GPA計算機', ar: '🎓 حاسبة المعدل' },
    courses_gpa_desc: { en: 'Uses each course\'s own grade weights.', tr: 'Her dersin kendi not ağırlıklarını kullanır.', de: 'Verwendet die individuellen Gewichtungen der Kurse.', es: 'Usa las ponderaciones propias de cada asignatura.', fr: 'Utilise les coefficients de chaque cours.', it: 'Utilizza i pesi di ciascun corso.', ru: 'Учитывает вес оценок каждого курса.', ko: '각 과목별 성적 가중치를 적용합니다.', ja: '各科目の配点割合を自動計算します。', ar: 'تعتمد على أوزان التقييم الخاصة بكل مقرر.' },
    courses_gpa_prompt: { en: 'Click below to calculate your GPA.', tr: 'Ortalamanızı hesaplamak için aşağıdaki butona tıklayın.', de: 'Klicke unten, um deinen GPA zu berechnen.', es: 'Haz clic abajo para calcular tu GPA.', fr: 'Cliquez ci-dessous pour calculer votre GPA.', it: 'Clicca sotto per calcolare la tua media.', ru: 'Нажмите ниже для расчета GPA.', ko: '아래 버튼을 눌러 GPA를 계산하세요.', ja: '下のボタンを押してGPAを計算してください。', ar: 'انقر أدناه لحساب المعدل التراكمي.' },
    courses_table_course: { en: 'Course', tr: 'Ders', de: 'Kurs', es: 'Asignatura', fr: 'Cours', it: 'Corso', ru: 'Курс', ko: '과목', ja: '科目', ar: 'المقرر' },
    courses_table_instructor: { en: 'Instructor', tr: 'Öğretim Görevlisi', de: 'Dozent', es: 'Profesor', fr: 'Enseignant', it: 'Docente', ru: 'Преподаватель', ko: '교수', ja: '担当教員', ar: 'المدرس' },
    courses_table_credits: { en: 'Credit', tr: 'Kredi', de: 'Credits', es: 'Crédito', fr: 'Crédits', it: 'Crediti', ru: 'Кредиты', ko: '학점', ja: '単位', ar: 'الساعات' },
    courses_table_midterm: { en: 'Midterm', tr: 'Vize', de: 'Zwischenprüfung', es: 'Parcial', fr: 'Partiel', it: 'Parziale', ru: 'Промежуточный', ko: '중간고사', ja: '中間', ar: 'النصفي' },
    courses_table_project: { en: 'Project', tr: 'Proje', de: 'Projekt', es: 'Proyecto', fr: 'Projet', it: 'Progetto', ru: 'Проект', ko: '프로젝트', ja: '課題', ar: 'المشروع' },
    courses_table_req_final: { en: 'Req. Final', tr: 'Gereken Final', de: 'Benötigter Abschluss', es: 'Final Requerido', fr: 'Final Requis', it: 'Finale Richiesto', ru: 'Требуемый итоговый', ko: '필요 기말 점수', ja: '必要期末点', ar: 'النهائي المطلوب' },
    courses_table_final: { en: 'Final', tr: 'Final', de: 'Abschluss', es: 'Final', fr: 'Final', it: 'Finale', ru: 'Итоговый', ko: '기말고사', ja: '期末', ar: 'النهائي' },
    courses_table_result: { en: 'Result', tr: 'Sonuç', de: 'Ergebnis', es: 'Resultado', fr: 'Résultat', it: 'Risultato', ru: 'Результат', ko: '결과', ja: '結果', ar: 'النتيجة' },
    courses_table_makeup: { en: 'Makeup Grade', tr: 'Büt Notu', de: 'Nachprüfung', es: 'Nota Extraordinaria', fr: 'Rattrapage', it: 'Recupero', ru: 'Пересдача', ko: '재시험', ja: '再試験', ar: 'التكميلي' },
    courses_table_extra: { en: 'Extra Grades', tr: 'Ekstra Notlar', de: 'Weitere Noten', es: 'Notas Extra', fr: 'Notes Supp.', it: 'Voti Extra', ru: 'Доп. оценки', ko: '기타 성적', ja: 'その他点数', ar: 'درجات إضافية' },
    courses_table_status: { en: 'Status', tr: 'Durum', de: 'Status', es: 'Estado', fr: 'Statut', it: 'Stato', ru: 'Статус', ko: '상태', ja: '状態', ar: 'الحالة' },
    courses_table_action: { en: 'Action', tr: 'İşlem', de: 'Aktion', es: 'Acción', fr: 'Action', it: 'Azione', ru: 'Действие', ko: '작업', ja: '操作', ar: 'الإجراء' },
    courses_transcript_btn: { en: '📄 View Official Transcript', tr: '📄 Resmi Transkript Görüntüle', de: '📄 Offizielles Transkript ansehen', es: '📄 Ver Certificado Oficial', fr: '📄 Relevé de Notes Officiel', it: '📄 Visualizza Piano Studi Ufficiale', ru: '📄 Просмотр официального транскрипта', ko: '📄 공식 성적증명서 보기', ja: '📄 成績証明書を表示', ar: '📄 عرض كشف الدرجات الرسمي' },

    // Deadlines & Exams Page
    deadlines_title: { en: 'Deadlines & Exams', tr: 'Sınavlar ve Teslim Tarihleri', de: 'Fristen & Prüfungen', es: 'Fechas Límite y Exámenes', fr: 'Échéances et Examens', it: 'Scadenze ed Esami', ru: 'Дедлайны и экзамены', ko: '마감일 및 시험', ja: '締切と試験日程', ar: 'المواعيد والاختبارات' },
    deadlines_subtitle: { en: 'Track and manage your upcoming exams, projects, and assignments.', tr: 'Yaklaşan sınavlarını, projelerini ve ödevlerini kolayca takip et.', de: 'Verfolge anstehende Prüfungen, Projekte und Aufgaben.', es: 'Sigue tus próximos exámenes, proyectos y tareas.', fr: 'Suivez vos examens, projets et devoirs à venir.', it: 'Organizza i tuoi esami, progetti e compiti.', ru: 'Отслеживайте предстоящие экзамены, проекты и задания.', ko: '예정된 시험, 프로젝트, 과제를 관리하세요.', ja: '試験、課題、レポートの日程を管理します。', ar: 'تتبع ونظم اختباراتك ومشاريعك وواجباتك القادمة.' },
    deadlines_add_exam: { en: 'Add Exam', tr: 'Sınav Ekle', de: 'Prüfung hinzufügen', es: 'Añadir Examen', fr: 'Ajouter un Examen', it: 'Aggiungi Esame', ru: 'Добавить экзамен', ko: '시험 추가', ja: '試験を追加', ar: 'إضافة اختبار' },
    deadlines_add_project: { en: 'Add Project', tr: 'Proje Ekle', de: 'Projekt hinzufügen', es: 'Añadir Proyecto', fr: 'Ajouter un Projet', it: 'Aggiungi Progetto', ru: 'Добавить проект', ko: '프로젝트 추가', ja: '課題を追加', ar: 'إضافة مشروع' },
    deadlines_add_activity: { en: 'Add Activity (homework, quiz, etc.)', tr: 'Aktivite Ekle (ödev, quiz vb.)', de: 'Aktivität hinzufügen (Hausaufgabe, Quiz etc.)', es: 'Añadir Actividad (tarea, quiz, etc.)', fr: 'Ajouter une Activité (devoir, quiz, etc.)', it: 'Aggiungi Attività (compito, quiz, ecc.)', ru: 'Добавить задание (тест, дз и др.)', ko: '활동 추가 (과제, 퀴즈 등)', ja: '課題・小テストを追加', ar: 'إضافة نشاط (واجب، اختبار قصير إلخ)' },
    deadlines_exam_date: { en: 'Exam Date', tr: 'Sınav Tarihi', de: 'Prüfungsdatum', es: 'Fecha del Examen', fr: 'Date d\'Examen', it: 'Data Esame', ru: 'Дата экзамена', ko: '시험 일자', ja: '試験日', ar: 'تاريخ الاختبار' },
    deadlines_due_date: { en: 'Due Date', tr: 'Teslim Tarihi', de: 'Fälligkeitsdatum', es: 'Fecha Límite', fr: 'Date Limite', it: 'Data di Scadenza', ru: 'Срок сдачи', ko: '마감일', ja: '締切日', ar: 'موعد التسليم' },
    deadlines_exam_type: { en: 'Exam Type', tr: 'Sınav Türü', de: 'Prüfungsart', es: 'Tipo de Examen', fr: 'Type d\'Examen', it: 'Tipo di Esame', ru: 'Тип экзамена', ko: '시험 유형', ja: '試験種別', ar: 'نوع الاختبار' },
    deadlines_save_exam: { en: 'Save Exam', tr: 'Sınavı Kaydet', de: 'Prüfung speichern', es: 'Guardar Examen', fr: 'Enregistrer l\'Examen', it: 'Salva Esame', ru: 'Сохранить экзамен', ko: '시험 저장', ja: '試験を保存', ar: 'حفظ الاختبار' },
    deadlines_save_project: { en: 'Save Project', tr: 'Projeyi Kaydet', de: 'Projekt speichern', es: 'Guardar Proyecto', fr: 'Enregistrer le Projet', it: 'Salva Progetto', ru: 'Сохранить проект', ko: '프로젝트 저장', ja: '課題を保存', ar: 'حفظ المشروع' },
    deadlines_save_activity: { en: 'Save Activity', tr: 'Aktiviteyi Kaydet', de: 'Aktivität speichern', es: 'Guardar Actividad', fr: 'Enregistrer l\'Activité', it: 'Salva Attività', ru: 'Сохранить задание', ko: '활동 저장', ja: 'アクティビティを保存', ar: 'حفظ النشاط' },
    deadlines_active_tab: { en: 'Active Deadlines', tr: 'Yaklaşan Sınavlar ve Teslimler', de: 'Aktive Fristen', es: 'Entregas Activas', fr: 'Échéances Actives', it: 'Scadenze Attive', ru: 'Текущие дедлайны', ko: '진행 중인 마감일', ja: '進行中の締切', ar: 'المواعيد النشطة' },
    deadlines_completed_tab: { en: 'Completed', tr: 'Tamamlananlar', de: 'Erledigt', es: 'Completadas', fr: 'Terminé', it: 'Completate', ru: 'Завершенные', ko: '완료된 항목', ja: '完了済み', ar: 'المكتملة' },
    deadlines_all_tab: { en: 'All Items', tr: 'Tüm Kayıtlar', de: 'Alle Einträge', es: 'Todos los Elementos', fr: 'Tous les Éléments', it: 'Tutti gli Elementi', ru: 'Все записи', ko: '전체 항목', ja: 'すべての項目', ar: 'جميع العناصر' },
    deadlines_upcoming: { en: 'Upcoming', tr: 'Yaklaşanlar', de: 'Anstehend', es: 'Próximos', fr: 'À venir', it: 'Prossimi', ru: 'Предстоящие', ko: '예정된 항목', ja: '予定', ar: 'القادمة' },
    deadlines_overdue: { en: 'Overdue', tr: 'Gecikenler', de: 'Überfällig', es: 'Atrasadas', fr: 'En retard', it: 'In ritardo', ru: 'Просрочено', ko: '기한 초과', ja: '期限超過', ar: 'متأخر' },
    deadlines_completed: { en: 'Completed', tr: 'Tamamlananlar', de: 'Erledigt', es: 'Completadas', fr: 'Terminées', it: 'Completate', ru: 'Завершено', ko: '완료됨', ja: '完了', ar: 'مكتمل' },
    deadlines_all: { en: 'All', tr: 'Tümü', de: 'Alle', es: 'Todos', fr: 'Tous', it: 'Tutti', ru: 'Все', ko: '전체', ja: 'すべて', ar: 'الكل' },
    deadlines_clean_old: { en: '🧹 Clean Past Items', tr: '🧹 Geçmiş Sınavları Temizle', de: '🧹 Alte Einträge löschen', es: '🧹 Limpiar Pasados', fr: '🧹 Nettoyer Passés', it: '🧹 Pulisci Passati', ru: '🧹 Очистить старые', ko: '🧹 지난 일정 정리', ja: '🧹 過去の日程を整理', ar: '🧹 تنظيف المواعيد السابقة' },
    deadlines_syllabus_import: { en: '📄 AI Syllabus Import', tr: '📄 AI Müfredat / Sınav Aktar', de: '📄 KI-Lehrplan-Import', es: '📄 Importar Programa con IA', fr: '📄 Import IA du Syllabus', it: '📄 Importa Syllabus con IA', ru: '📄 Импорт силлабуса с ИИ', ko: '📄 AI 강의계획서 가져오기', ja: '📄 AIシラバス自動抽出', ar: '📄 استيراد الخطة بالذكاء الاصطناعي' },
    deadlines_course_select_placeholder: { en: 'Select course...', tr: 'Ders seçin...', de: 'Kurs auswählen...', es: 'Seleccionar asignatura...', fr: 'Choisir le cours...', it: 'Seleziona corso...', ru: 'Выберите курс...', ko: '과목 선택...', ja: '科目を選択...', ar: 'اختر المقرر...' },
    deadlines_type_midterm: { en: 'Midterm Exam', tr: 'Vize Sınavı', de: 'Zwischenprüfung', es: 'Examen Parcial', fr: 'Examen Partiel', it: 'Esame Parziale', ru: 'Промежуточный экзамен', ko: '중간고사', ja: '中間試験', ar: 'اختبار نصفي' },
    deadlines_type_final: { en: 'Final Exam', tr: 'Final Sınavı', de: 'Abschlussprüfung', es: 'Examen Final', fr: 'Examen Final', it: 'Esame Finale', ru: 'Итоговый экзамен', ko: '기말고사', ja: '期末試験', ar: 'اختبار نهائي' },
    deadlines_type_quiz: { en: 'Quiz', tr: 'Kısa Sınav (Quiz)', de: 'Quiz', es: 'Cuestionario / Quiz', fr: 'Quiz / Interro', it: 'Quiz', ru: 'Тест / Квиз', ko: '퀴즈 / 쪽지시험', ja: '小テスト', ar: 'اختبار قصير' },
    deadlines_type_other: { en: 'Other', tr: 'Diğer', de: 'Sonstiges', es: 'Otro', fr: 'Autre', it: 'Altro', ru: 'Другое', ko: '기타', ja: 'その他', ar: 'أخرى' },
    deadlines_type_homework: { en: 'Homework / Assignment', tr: 'Ödev', de: 'Hausaufgabe', es: 'Tarea', fr: 'Devoir', it: 'Compito', ru: 'Домашняя работа', ko: '과제', ja: '宿題・課題', ar: 'واجب منزلي' },
    deadlines_table_type: { en: 'Type', tr: 'Tür', de: 'Typ', es: 'Tipo', fr: 'Type', it: 'Tipo', ru: 'Тип', ko: '유형', ja: '種別', ar: 'النوع' },
    deadlines_table_date: { en: 'Date', tr: 'Tarih', de: 'Datum', es: 'Fecha', fr: 'Date', it: 'Data', ru: 'Дата', ko: '날짜', ja: '日付', ar: 'التاريخ' },
    deadlines_project_topic_placeholder: { en: 'Project topic (e.g. Phase 1 Report)', tr: 'Proje konusu (örn. Aşama 1 Raporu)', de: 'Projektthema (z.B. Zwischenbericht)', es: 'Tema del proyecto (ej. Informe Fase 1)', fr: 'Sujet du projet (ex. Rapport Étape 1)', it: 'Argomento progetto (es. Relazione Fase 1)', ru: 'Тема проекта (напр. Отчет по этапу 1)', ko: '프로젝트 주제 (예: 1단계 보고서)', ja: '課題のテーマ (例: フェーズ1報告書)', ar: 'موضوع المشروع (مثال: تقرير المرحلة 1)' },
    deadlines_activity_title_placeholder: { en: 'Activity title (e.g. Reading Quiz 2)', tr: 'Aktivite başlığı (örn. Okuma Quiz 2)', de: 'Titel (z.B. Lese-Quiz 2)', es: 'Título de la actividad (ej. Cuestionario 2)', fr: 'Titre de l\'activité (ex. Quiz 2)', it: 'Titolo attività (es. Quiz di Lettura 2)', ru: 'Название задания (напр. Тест по чтению 2)', ko: '활동 제목 (예: 독서 퀴즈 2)', ja: 'アクティビティ名 (例: リーディング小テスト2)' },
    deadlines_table_project_topic: { en: 'Project Topic', tr: 'Proje Konusu', de: 'Projektthema', es: 'Tema del Proyecto', fr: 'Sujet du Projet', it: 'Argomento Progetto', ru: 'Тема проекта', ko: '프로젝트 주제', ja: '課題テーマ', ar: 'موضوع المشروع' },
    deadlines_table_title: { en: 'Title', tr: 'Başlık', de: 'Titel', es: 'Título', fr: 'Titre', it: 'Titolo', ru: 'Название', ko: '제목', ja: 'タイトル', ar: 'العنوان' },
    deadlines_no_items: { en: 'No deadlines or exams found.', tr: 'Kayıtlı sınav veya teslim tarihi bulunamadı.', de: 'Keine Fristen gefunden.', es: 'No se encontraron fechas límite.', fr: 'Aucune échéance trouvée.', it: 'Nessuna scadenza trovata.', ru: 'Дедлайны не найдены.', ko: '등록된 마감일이나 시험이 없습니다.', ja: '締切や試験は見つかりませんでした。', ar: 'لم يتم العثور على مواعيد أو اختبارات.' },
    deadlines_status_pending: { en: 'Pending', tr: 'Bekliyor', de: 'Ausstehend', es: 'Pendiente', fr: 'En attente', it: 'In attesa', ru: 'Ожидает', ko: '대기 중', ja: '未完了', ar: 'قيد الانتظار' },
    deadlines_status_completed: { en: 'Completed', tr: 'Tamamlandı', de: 'Abgeschlossen', es: 'Completado', fr: 'Terminé', it: 'Completato', ru: 'Завершено', ko: '완료됨', ja: '完了', ar: 'مكتمل' },
    deadlines_item_midterm: { en: 'Midterm Exam', tr: 'Vize Sınavı', de: 'Zwischenprüfung', es: 'Examen Parcial', fr: 'Examen Partiel', it: 'Esame Parziale', ru: 'Промежуточный экзамен', ko: '중간고사', ja: '中間試験', ar: 'اختبار نصفي' },
    deadlines_item_final: { en: 'Final Exam', tr: 'Final Sınavı', de: 'Abschlussprüfung', es: 'Examen Final', fr: 'Examen Final', it: 'Esame Finale', ru: 'Итоговый экзамен', ko: '기말고사', ja: '期末試験', ar: 'اختبار نهائي' },
    deadlines_item_makeup: { en: 'Makeup Exam', tr: 'Bütünleme Sınavı', de: 'Nachprüfung', es: 'Examen Extraordinario', fr: 'Examen de Rattrapage', it: 'Esame di Recupero', ru: 'Пересдача', ko: '재시험', ja: '追試験・再試', ar: 'اختبار تكميلي' },
    deadlines_item_quiz: { en: 'Quiz', tr: 'Kısa Sınav (Quiz)', de: 'Quiz / Test', es: 'Quiz / Cuestionario', fr: 'Quiz / Interro', it: 'Quiz', ru: 'Квиз / Тест', ko: '퀴즈 / 쪽지시험', ja: '小テスト', ar: 'اختبار قصير' },
    deadlines_item_project: { en: 'Project', tr: 'Proje Teslimi', de: 'Projektabgabe', es: 'Entrega de Proyecto', fr: 'Rendu de Projet', it: 'Consegna Progetto', ru: 'Сдача проекта', ko: '프로젝트 제출', ja: 'プロジェクト提出', ar: 'تسليم مشروع' },
    deadlines_item_assignment: { en: 'Assignment', tr: 'Ödev Teslimi', de: 'Hausaufgabe', es: 'Tarea', fr: 'Devoir', it: 'Compito', ru: 'Домашнее задание', ko: '과제 제출', ja: '課題提出', ar: 'تسليم واجب' },
    deadlines_item_presentation: { en: 'Presentation', tr: 'Sunum', de: 'Präsentation', es: 'Presentación', fr: 'Présentation', it: 'Presentazione', ru: 'Презентация', ko: '발표', ja: 'プレゼンテーション', ar: 'عرض تقديمي' },

    // Calendar Export Modal
    deadlines_cal_selected_count: { en: '({n} selected)', tr: '({n} seçildi)', de: '({n} ausgewählt)', es: '({n} seleccionados)', fr: '({n} sélectionnés)', it: '({n} selezionati)', ru: '({n} выбрано)', ko: '({n}개 선택됨)', ja: '({n}件 選択中)', ar: '({n} محدد)' },
    deadlines_cal_export_selected: { en: '📥 Export Selected to .ics', tr: '📥 Seçilenleri .ics Olarak Aktar', de: '📥 Ausgewählte als .ics exportieren', es: '📥 Exportar Seleccionados a .ics', fr: '📥 Exporter la Sélection en .ics', it: '📥 Esporta Selezionati in .ics', ru: '📥 Экспорт выбранных в .ics', ko: '📥 선택 항목 .ics로 내보내기', ja: '📥 選択した予定を.ics出力', ar: '📥 تصدير المحدد بتنسيق .ics' },
    deadlines_cal_modal_title: { en: '📅 Calendar Sync & Export', tr: '📅 Takvime Aktar & Dışa Aktar', de: '📅 Kalendersynchronisation', es: '📅 Sincronización de Calendario', fr: '📅 Synchronisation du Calendrier', it: '📅 Sincronizzazione Calendario', ru: '📅 Экспорт в календарь', ko: '📅 캘린더 동기화 및 내보내기', ja: '📅 カレンダー連携・エクスポート', ar: '📅 مزامنة وتصدير التقويم' },
    deadlines_cal_modal_subtitle: { en: 'Export your exams and project deadlines to Google Calendar, Apple Calendar, or Outlook.', tr: 'Sınav ve teslim tarihlerini Google Takvim, Apple Takvim veya Outlook\'a aktarın.', de: 'Exportiere Prüfungen und Fristen in deinen Google Kalender, Apple Kalender oder Outlook.', es: 'Exporta tus exámenes y entregas a Google Calendar, Apple Calendar u Outlook.', fr: 'Exportez vos examens vers Google Calendar, Apple Calendar ou Outlook.', it: 'Esporta esami e scadenze su Google Calendar, Apple Calendar o Outlook.', ru: 'Экспортируйте экзамены в Google Календарь, Apple Calendar или Outlook.', ko: '시험 및 마감일을 Google 캘린더, Apple 캘린더 또는 Outlook으로 내보내세요.', ja: '試験や締切日程をGoogleカレンダー、Appleカレンダー、Outlookに出力します。', ar: 'تصدير مواعيد الاختبارات والتسليم إلى تقويم Google أو Apple أو Outlook.' },
    deadlines_cal_tab_exams: { en: 'Exams', tr: 'Sınavlar', de: 'Prüfungen', es: 'Exámenes', fr: 'Examens', it: 'Esami', ru: 'Экзамены', ko: '시험', ja: '試験', ar: 'الاختبارات' },
    deadlines_cal_tab_projects: { en: 'Projects', tr: 'Projeler', de: 'Projekte', es: 'Proyectos', fr: 'Projets', it: 'Progetti', ru: 'Проекты', ko: '프로젝트', ja: 'プロジェクト', ar: 'المشاريع' },
    deadlines_cal_tab_upcoming: { en: 'Upcoming Only', tr: 'Sadece Yaklaşanlar', de: 'Nur anstehende', es: 'Solo Próximos', fr: 'Uniquement à venir', it: 'Solo Prossimi', ru: 'Только предстоящие', ko: '예정된 항목만', ja: '今後の予定のみ', ar: 'القادمة فقط' },
    deadlines_cal_select_all: { en: 'Select All', tr: 'Tümünü Seç', de: 'Alle auswählen', es: 'Seleccionar Todo', fr: 'Tout Sélectionner', it: 'Seleziona Tutto', ru: 'Выбрать все', ko: '전체 선택', ja: 'すべて選択', ar: 'تحديد الكل' },
    deadlines_cal_deselect_all: { en: 'Deselect All', tr: 'Seçimi Kaldır', de: 'Auswahl aufheben', es: 'Deseleccionar Todo', fr: 'Tout Désélectionner', it: 'Deseleziona Tutto', ru: 'Снять выбор', ko: '선택 해제', ja: '選択解除', ar: 'إلغاء التحديد' },
    deadlines_cal_export_all: { en: '📥 Export All to .ics', tr: '📥 Tümünü .ics Olarak İndir', de: '📥 Alle als .ics exportieren', es: '📥 Exportar Todo a .ics', fr: '📥 Tout Exporter en .ics', it: '📥 Esporta Tutto in .ics', ru: '📥 Экспортировать все в .ics', ko: '📥 전체 .ics로 내보내기', ja: '📥 すべて.ics出力', ar: '📥 تصدير الكل بتنسيق .ics' },
    deadlines_cal_how_to: { en: 'How to import into your calendar?', tr: 'Takviminize nasıl aktarırsınız?', de: 'Wie importierst du in deinen Kalender?', es: '¿Cómo importar en tu calendario?', fr: 'Comment importer dans votre calendrier ?', it: 'Come importare nel tuo calendario?', ru: 'Как импортировать в календарь?', ko: '캘린더로 어떻게 가져오나요?', ja: 'カレンダーへの追加手順', ar: 'كيفية الاستيراد إلى تقويمك؟' },
    deadlines_cal_open_settings: { en: 'Open Calendar Settings', tr: 'Takvim Ayarlarını Aç', de: 'Kalendereinstellungen öffnen', es: 'Abrir Ajustes de Calendario', fr: 'Ouvrir les Paramètres du Calendrier', it: 'Apri Impostazioni Calendario', ru: 'Открыть настройки календаря', ko: '캘린더 설정 열기', ja: 'カレンダー設定を開く', ar: 'فتح إعدادات التقويم' },
    deadlines_cal_step1: { en: 'Download the .ics file using the button above.', tr: 'Yukarıdaki butona tıklayarak .ics dosyasını indirin.', de: 'Lade die .ics-Datei mit dem Button oben herunter.', es: 'Descarga el archivo .ics usando el botón superior.', fr: 'Téléchargez le fichier .ics avec le bouton ci-dessus.', it: 'Scarica il file .ics usando il pulsante sopra.', ru: 'Скачайте файл .ics с помощью кнопки выше.', ko: '위의 버튼을 눌러 .ics 파일을 다운로드하세요.', ja: '上のボタンから.icsファイルをダウンロードします。', ar: 'قم بتنزيل ملف .ics باستخدام الزر أعلاه.' },
    deadlines_cal_step2: { en: 'Open Google Calendar, Apple Calendar, or Outlook on your device.', tr: 'Cihazınızda Google Takvim, Apple Takvim veya Outlook\'u açın.', de: 'Öffne deinen Google Kalender, Apple Kalender oder Outlook.', es: 'Abre Google Calendar, Apple Calendar u Outlook en tu dispositivo.', fr: 'Ouvrez Google Calendar, Apple Calendar ou Outlook.', it: 'Apri Google Calendar, Apple Calendar o Outlook.', ru: 'Откройте Google Календарь, Apple Calendar или Outlook.', ko: '기기에서 Google 캘린더, Apple 캘린더 또는 Outlook을 엽니다.', ja: 'お使いの端末でGoogleカレンダー、Appleカレンダー、Outlookを開きます。' },
    deadlines_cal_step3: { en: 'Go to Settings > Import & Export > Import, then select the downloaded file.', tr: 'Ayarlar > İçe Aktar bölümünden indirdiğiniz dosyayı seçin.', de: 'Gehe auf Einstellungen > Importieren und wähle die Datei aus.', es: 'Ve a Configuración > Importar y selecciona el archivo descargado.', fr: 'Allez dans Paramètres > Importer et choisissez le fichier.', it: 'Vai su Impostazioni > Importa e seleziona il file scaricato.', ru: 'Перейдите в Настройки > Импорт и выберите скачанный файл.', ko: '설정 > 가져오기에서 다운로드한 파일을 선택하세요.', ja: '設定 > インポートからダウンロードしたファイルを選択します。', ar: 'انتقل إلى الإعدادات > استيراد وحدد الملف الذي تم تنزيله.' },

    // AI Syllabus Extractor
    syllabus_modal_title: { en: '📄 AI Syllabus & Exam Extractor', tr: '📄 AI Müfredat & Sınav Takvimi Ayrıştırıcı', de: '📄 KI-Lehrplan & Prüfungs-Extraktor', es: '📄 Extractor de Sílabo y Exámenes con IA', fr: '📄 Extracteur IA de Syllabus et Examens', it: '📄 Estrattore Syllabus ed Esami IA', ru: '📄 Извлечение экзаменов из силлабуса с ИИ', ko: '📄 AI 강의계획서 및 시험 일정 추출', ja: '📄 AIシラバス・試験日程抽出', ar: '📄 استخراج مواعيد الاختبارات من الخطة بالذكاء الاصطناعي' },
    syllabus_modal_subtitle: { en: 'Upload your course syllabus (PDF, Word, TXT) and AI will automatically detect exams & due dates.', tr: 'Ders izlencesini (PDF, Word, TXT) yükleyin, yapay zeka sınav ve teslim tarihlerini otomatik bulsun.', de: 'Lade deinen Lehrplan hoch (PDF, Word, TXT), damit die KI Termine automatisch erkennt.', es: 'Sube tu programa (PDF, Word, TXT) y la IA detectará automáticamente los exámenes.', fr: 'Importez votre syllabus (PDF, Word, TXT) et l\'IA détectera vos échéances.', it: 'Carica il syllabus (PDF, Word, TXT) e l\'IA rileverà le scadenze.', ru: 'Загрузите силлабус (PDF, Word, TXT), и ИИ найдет даты экзаменов.', ko: '강의계획서(PDF, Word, TXT)를 업로드하면 AI가 시험 및 마감일을 자동으로 감지합니다.', ja: 'シラバス(PDF、Word、TXT)をアップロードすると、AIが試験日程や締切を自動検出します。', ar: 'قم بتحميل خطة المقرر (PDF, Word, TXT) وسيقوم الذكاء الاصطناعي باكتشاف مواعيد الاختبارات تلقائياً.' },
    syllabus_label: { en: 'Upload Syllabus Document', tr: 'Müfredat Belgesi Yükle', de: 'Lehrplan-Dokument hochladen', es: 'Subir Documento de Programa', fr: 'Charger le Document de Syllabus', it: 'Carica Documento Syllabus', ru: 'Загрузить файл силлабуса', ko: '강의계획서 파일 업로드', ja: 'シラバスファイルをアップロード', ar: 'تحميل ملف الخطة الدراسية' },
    syllabus_supported: { en: 'Supported formats: PDF, DOCX, TXT', tr: 'Desteklenen formatlar: PDF, DOCX, TXT', de: 'Unterstützte Formate: PDF, DOCX, TXT', es: 'Formatos soportados: PDF, DOCX, TXT', fr: 'Formats supportés : PDF, DOCX, TXT', it: 'Formati supportati: PDF, DOCX, TXT', ru: 'Поддерживаемые форматы: PDF, DOCX, TXT', ko: '지원 형식: PDF, DOCX, TXT', ja: '対応形式: PDF, DOCX, TXT', ar: 'الملفات المدعومة: PDF, DOCX, TXT' },
    syllabus_parse_btn: { en: '⚡ Extract Deadlines with AI', tr: '⚡ Yapay Zeka ile Tarihleri Çıkar', de: '⚡ Termine mit KI extrahieren', es: '⚡ Extraer Fechas con IA', fr: '⚡ Extraire les Échéances avec l\'IA', it: '⚡ Estrai Scadenze con IA', ru: '⚡ Извлечь дедлайны с помощью ИИ' },

    // Study Tracker Page
    study_title: { en: 'Study Sessions & Timer', tr: 'Çalışma Takibi ve Zamanlayıcı', de: 'Lernzeiten & Timer', es: 'Sesiones y Cronómetro', fr: 'Sessions d\'Étude & Minuteur', it: 'Sessioni di Studio e Timer', ru: 'Учебные сессии и таймер', ko: '학습 세션 및 타이머', ja: '学習記録とタイマー', ar: 'جلسات المذاكرة والمؤقت' },
    study_subtitle: { en: 'Track your focus hours with stopwatch or log sessions manually.', tr: 'Kronometreyle odaklanma süreni ölç veya manuel seans kaydet.', de: 'Erfasse deine Lernzeiten mit der Stoppuhr oder trage sie manuell ein.', es: 'Registra tus horas de concentración con el cronómetro o manualmente.', fr: 'Chronométrez votre temps de révision ou ajoutez des sessions manuelles.', it: 'Registra le ore di studio con il cronometro o manualmente.', ru: 'Отслеживайте время учебы с секундомером или вручную.', ko: '스톱워치로 집중 시간을 측정하거나 수동으로 학습 세션을 기록하세요.', ja: 'ストップウォッチで集中時間を計測、または手動でセッションを記録します。', ar: 'تتبع ساعات تركيزك باستخدام ساعة الإيقاف أو سجل الجلسات يدوياً.' },
    study_manual_entry_heading: { en: 'Manual Session Entry', tr: 'Manuel Seans Ekle', de: 'Manuelle Eingabe', es: 'Entrada Manual', fr: 'Ajout Manuel', it: 'Inserimento Manuale', ru: 'Ручной ввод сессии', ko: '수동 학습 기록', ja: '手動セッション追加', ar: 'إدخال جلسة يدوية' },
    study_add_heading: { en: 'Manual Session Entry', tr: 'Manuel Seans Ekle', de: 'Manuelle Eingabe', es: 'Entrada Manual', fr: 'Ajout Manuel', it: 'Inserimento Manuale', ru: 'Ручной ввод сессии', ko: '수동 학습 기록', ja: '手動セッション追加', ar: 'إدخال جلسة يدوية' },
    study_date_label: { en: 'Date', tr: 'Tarih', de: 'Datum', es: 'Fecha', fr: 'Date', it: 'Data', ru: 'Дата', ko: '날짜', ja: '日付', ar: 'التاريخ' },
    study_course_label: { en: 'Course', tr: 'Ders', de: 'Kurs', es: 'Asignatura', fr: 'Cours', it: 'Corso', ru: 'Курс', ko: '과목', ja: '科目', ar: 'المقرر' },
    study_course_placeholder: { en: 'Select or type course...', tr: 'Ders seçin veya yazın...', de: 'Kurs wählen oder eingeben...', es: 'Selecciona o escribe asignatura...', fr: 'Choisir ou saisir le cours...', it: 'Seleziona o scrivi corso...', ru: 'Выберите или введите курс...', ko: '과목 선택 또는 입력...', ja: '科目を選択または入力...', ar: 'اختر أو اكتب المقرر...' },
    study_hours_placeholder: { en: 'Study hours', tr: 'Çalışma süresi (saat)', de: 'Lernstunden', es: 'Horas de estudio', fr: 'Heures d\'étude', it: 'Ore di studio', ru: 'Часы учебы', ko: '학습 시간 (시간)', ja: '学習時間 (時間)', ar: 'ساعات المذاكرة' },
    study_topic_placeholder: { en: 'Studied topics', tr: 'Çalışılan konular', de: 'Gelernte Themen', es: 'Temas estudiados', fr: 'Sujets étudiés', it: 'Argomenti studiati', ru: 'Изученные темы', ko: '공부한 내용/주제', ja: '学習内容・トピック', ar: 'الموضوعات التي تمت مذاكرتها' },
    study_save_btn: { en: 'Save Session', tr: 'Seansı Kaydet', de: 'Einheit speichern', es: 'Guardar Sesión', fr: 'Enregistrer la Session', it: 'Salva Sessione', ru: 'Сохранить сессию', ko: '세션 저장', ja: 'セッションを保存', ar: 'حفظ الجلسة' },
    study_filter_heading: { en: 'Filter Sessions', tr: 'Seansları Filtrele', de: 'Einheiten filtern', es: 'Filtrar Sesiones', fr: 'Filtrer les Sessions', it: 'Filtra Sessioni', ru: 'Фильтр сессий', ko: '세션 필터', ja: 'セッション絞り込み', ar: 'تصفية الجلسات' },
    study_all_dates: { en: 'All Dates', tr: 'Tüm Tarihler', de: 'Alle Daten', es: 'Todas las Fechas', fr: 'Toutes les Dates', it: 'Tutte le Date', ru: 'Все даты', ko: '모든 날짜', ja: 'すべての日付', ar: 'جميع التواريخ' },
    study_all_courses: { en: 'All Courses', tr: 'Tüm Dersler', de: 'Alle Kurse', es: 'Todas las Asignaturas', fr: 'Tous les Cours', it: 'Tutti i Corsi', ru: 'Все курсы', ko: '모든 과목', ja: 'すべての科目', ar: 'جميع المقررات' },
    study_no_sessions: { en: 'No study sessions found.', tr: 'Kayıtlı çalışma seansı bulunamadı.', de: 'Keine Lerneinheiten gefunden.', es: 'No se encontraron sesiones.', fr: 'Aucune session trouvée.', it: 'Nessuna sessione trovata.', ru: 'Сессии не найдены.', ko: '학습 세션이 없습니다.', ja: '学習セッションはありません。', ar: 'لم يتم العثور على جلسات مذاكرة.' },
    study_table_duration: { en: 'Duration', tr: 'Süre', de: 'Dauer', es: 'Duración', fr: 'Durée', it: 'Durata', ru: 'Длительность', ko: '시간', ja: '時間', ar: 'المدة' },
    study_table_topic: { en: 'Topic', tr: 'Konu', de: 'Thema', es: 'Tema', fr: 'Sujet', it: 'Argomento', ru: 'Тема', ko: '주제', ja: 'トピック', ar: 'الموضوع' },
    study_sessions_for: { en: 'Sessions for {date} ({day})', tr: '{date} ({day}) Çalışmaları', de: 'Einheiten für {date} ({day})', es: 'Sesiones de {date} ({day})', fr: 'Sessions du {date} ({day})', it: 'Sessioni di {date} ({day})', ru: 'Сессии за {date} ({day})', ko: '{date} ({day}) 학습 내역', ja: '{date} ({day}) の学習', ar: 'جلسات {date} ({day})' },
    study_no_for_day: { en: 'There is no saved study session for {date} ({day}).', tr: '{date} ({day}) tarihi için kaydedilmiş çalışma seansı bulunmuyor.', de: 'Keine Lerneinheit für {date} ({day}) gespeichert.', es: 'No hay sesiones para {date} ({day}).', fr: 'Aucune session pour le {date} ({day}).', it: 'Nessuna sessione salvata per {date} ({day}).', ru: 'Нет записей за {date} ({day}).', ko: '{date} ({day})에 저장된 학습 세션이 없습니다.', ja: '{date} ({day}) の保存されたセッションはありません。', ar: 'لا توجد جلسة مذاكرة مسجلة لـ {date} ({day}).' },

    // Buddies Modal
    buddies_modal_title: { en: 'Academi Buddies & Study Streaks', tr: 'Çalışma Arkadaşları & Seri Sıralaması', de: 'Lernpartner & Serien-Rangliste', es: 'Compañeros y Rachas de Estudio', fr: 'Camarades d\'Étude et Séries', it: 'Compagni di Studio e Classifica', ru: 'Однокурсники и серии учебы', ko: '스터디 버디 & 연속 기록', ja: 'スタディ仲間と連続記録', ar: 'زملاء المذاكرة والترتيب' },
    buddies_modal_subtitle: { en: 'Connect with classmates, share study streaks and motivate each other', tr: 'Sınıf arkadaşlarınla bağlan, çalışma serilerini paylaş ve birlikte motive ol', de: 'Vernetze dich mit Kommilitonen, teile Lernserien und motiviert euch', es: 'Conéctate con compañeros, comparte rachas de estudio y motívense', fr: 'Connectez-vous avec vos camarades, partagez vos séries et motivez-vous', it: 'Connettiti con i compagni, condividi le serie di studio e motivatevi', ru: 'Общайтесь с однокурсниками, делитесь сериями и мотивируйте друг друга', ko: '친구들과 연결하여 학습 연속 기록을 공유하고 서로 동기를 부여하세요', ja: 'クラスメイトとつながり、学習記録を共有して高め合いましょう', ar: 'تواصل مع زملائك وشارك فترات المذاكرة المتتالية وحفزوا بعضكم' },
    buddies_input_placeholder: { en: 'Enter classmate\'s email or username to send invite...', tr: 'Davet göndermek için arkadaşının e-postasını veya kullanıcı adını gir...', de: 'E-Mail oder Benutzername für Einladung eingeben...', es: 'Correo o usuario de tu compañero...', fr: 'E-mail ou nom de votre camarade...', it: 'Email o username del compagno...', ru: 'Email или имя однокурсника...', ko: '친구의 이메일 또는 사용자 이름 입력...', ja: '仲間のメールアドレスまたはユーザー名...', ar: 'أدخل البريد أو اسم المستخدم...' },
    buddies_you: { en: '(You)', tr: '(Sen)', de: '(Du)', es: '(Tú)', fr: '(Vous)', it: '(Tu)', ru: '(Вы)', ko: '(나)', ja: '(あなた)', ar: '(أنت)' },
    buddies_profile_desc: { en: 'Your Academic Study Profile', tr: 'Akademik Çalışma Profilin', de: 'Dein akademisches Lernprofil', es: 'Tu Perfil de Estudio Académico', fr: 'Votre Profil d\'Étude Académique', it: 'Il tuo Profilo di Studio', ru: 'Ваш академический профиль', ko: '나의 학업 프로필', ja: 'あなたの学習プロフィール', ar: 'ملفك الأكاديمي للدراسة' },
    buddies_streak_text: { en: '🔥 {n} day streak', tr: '🔥 {n} gün seri', de: '🔥 {n} Tage Serie', es: '🔥 Racha de {n} días', fr: '🔥 Série de {n} jours', it: '🔥 Serie di {n} giorni', ru: '🔥 Серия {n} дн.', ko: '🔥 {n}일 연속 달성', ja: '🔥 {n}日連続達成', ar: '🔥 سلسلة {n} أيام' },
    buddies_logged_week: { en: '{n}h logged this week', tr: 'Bu hafta {n} saat çalışıldı', de: 'Diese Woche {n} Std. gelernt', es: '{n}h registradas esta semana', fr: '{n}h cette semaine', it: '{n}h registrate questa settimana', ru: '{n}ч на этой неделе', ko: '이번 주 {n}시간 기록됨', ja: '今週 {n}時間 記録', ar: 'تم تسجيل {n} ساعة هذا الأسبوع' },
    buddies_leaderboard_title: { en: '🏆 Weekly Study Leaderboard ({n} students)', tr: '🏆 Haftalık Çalışma Sıralaması ({n} öğrenci)', de: '🏆 Wöchentliche Bestenliste ({n} Studenten)', es: '🏆 Clasificación Semanal ({n} estudiantes)', fr: '🏆 Classement Hebdomadaire ({n} étudiants)', it: '🏆 Classifica Settimanale ({n} studenti)', ru: '🏆 Рейтинг недели ({n} студентов)', ko: '🏆 주간 스터디 리더보드 ({n}명)', ja: '🏆 週間学習ランキング ({n}人)', ar: '🏆 لوحة الشرف الأسبوعية للمذاكرة ({n} طالب)' },
    buddies_no_buddies: { en: '👋 No buddies added yet!', tr: '👋 Henüz arkadaş eklenmedi!', de: '👋 Noch keine Lernpartner hinzugefügt!', es: '👋 ¡Aún no has añadido compañeros!', fr: '👋 Aucun camarade ajouté !', it: '👋 Nessun compagno aggiunto!', ru: '👋 Однокурсники еще не добавлены!', ko: '👋 아직 추가된 버디가 없습니다!', ja: '👋 まだ仲間が追加されていません！', ar: '👋 لم تتم إضافة زملاء بعد!' },
    buddies_invite_tip: { en: 'Type your classmate\'s email or name above to send an invitation. Once they accept, you\'ll study and maintain streaks together!', tr: 'Yukarıya sınıf arkadaşının adını veya e-postasını yazarak davet gönder. Kabul ettiklerinde serilerinizi birlikte takip edin!', de: 'Gib oben die E-Mail deines Lernpartners ein. Nach der Annahme könnt ihr gemeinsam lernen!', es: 'Escribe el correo de tu compañero arriba para invitarle. ¡Mantendrán rachas juntos!', fr: 'Entrez l\'e-mail de votre camarade ci-dessus. Une fois accepté, progressez ensemble !', it: 'Inserisci l\'email del compagno sopra. Una volta accettato, studierete insieme!', ru: 'Введите email однокурсника выше, чтобы отправить приглашение.', ko: '친구의 이메일을 입력하여 초대하세요. 수락하면 함께 공부 기록을 유지할 수 있습니다!', ja: 'メールアドレスを入力して招待状を送信しましょう。承認されると一緒に学習できます！', ar: 'أدخل بريد زميلك أعلاه لإرسال دعوة. بمجرد قبوله، ستذاكرون معاً وتحافظون على تقدمكم!' },
    buddies_remove_btn: { en: 'Remove Buddy', tr: 'Arkadaşı Çıkar', de: 'Lernpartner entfernen', es: 'Eliminar Compañero', fr: 'Supprimer le Camarade', it: 'Rimuovi Compagno', ru: 'Удалить однокурсника', ko: '버디 삭제', ja: '仲間を解除', ar: 'إزالة الزميل' },

    // Group Projects Modal & List
    group_modal_title: { en: 'Group Projects & Shared Tasks', tr: 'Grup Projeleri & Ortak Görevler', de: 'Gruppenprojekte & Geteilte Aufgaben', es: 'Proyectos Grupales y Tareas Compartidas', fr: 'Projets de Groupe et Tâches Partagées', it: 'Progetti di Gruppo e Compiti Condivisi', ru: 'Групповые проекты и общие задачи', ko: '그룹 프로젝트 및 공유 작업', ja: 'グループ課題と共有タスク', ar: 'مشاريع المجموعات والمهام المشتركة' },
    group_modal_subtitle: { en: 'Collaborate with classmates on term projects and track tasks together', tr: 'Dönem projelerinde arkadaşlarınla birlikte çalış ve görevleri yönet', de: 'Arbeite mit Kommilitonen an Semesterprojekten und verfolge Aufgaben', es: 'Colabora con compañeros en proyectos de curso y gestionen tareas juntos', fr: 'Collaborez sur vos projets et gérez vos tâches en équipe', it: 'Collabora con i compagni sui progetti e gestisci i compiti', ru: 'Работайте вместе над проектами и отслеживайте задачи', ko: '친구들과 학기 프로젝트를 협업하고 작업을 관리하세요', ja: '学期末プロジェクトでクラスメイトと協力し、タスクを管理します', ar: 'تعاون مع زملائك في المشاريع الفصلية وتابعوا المهام معاً' },
    group_new_project_btn: { en: '+ New Group Project', tr: '+ Yeni Grup Projesi', de: '+ Neues Gruppenprojekt', es: '+ Nuevo Proyecto Grupal', fr: '+ Nouveau Projet de Groupe', it: '+ Nuovo Progetto di Gruppo', ru: '+ Новый групповой проект', ko: '+ 새 그룹 프로젝트', ja: '+ 新規グループ課題', ar: '+ مشروع جماعي جديد' },
    group_create_title: { en: 'Create Collaborative Project', tr: 'Ortak Proje Oluştur', de: 'Gemeinsames Projekt erstellen', es: 'Crear Proyecto Colaborativo', fr: 'Créer un Projet Collaboratif', it: 'Crea Progetto Collaborativo', ru: 'Создать совместный проект', ko: '협업 프로젝트 생성', ja: '共同プロジェクトを作成', ar: 'إنشاء مشروع تعاوني' },
    group_title_placeholder: { en: 'Project Title (e.g. Software Eng. Term Project)', tr: 'Proje Başlığı (örn. Yazılım Müh. Dönem Projesi)', de: 'Projekttitel (z.B. Software Engineering Projekt)', es: 'Título del Proyecto (ej. Proyecto de Ing. Software)', fr: 'Titre du Projet (ex. Projet Génie Logiciel)', it: 'Titolo Progetto (es. Progetto Ingegneria del Software)', ru: 'Название проекта (напр. Курсовой проект ПО)', ko: '프로젝트 제목 (예: 소프트웨어공학 학기 프로젝트)', ja: '課題タイトル (例: ソフトウェア工学 最終課題)', ar: 'عنوان المشروع (مثال: مشروع هندسة البرمجيات)' },
    group_course_placeholder: { en: 'Course Name (e.g. CS411)', tr: 'Ders Adı (örn. BLG411)', de: 'Kursname (z.B. CS411)', es: 'Nombre de Asignatura (ej. CS411)', fr: 'Nom du Cours (ex. CS411)', it: 'Nome Corso (es. CS411)', ru: 'Код/название курса (напр. CS411)', ko: '과목명 (예: CS411)', ja: '科目名 (例: CS411)', ar: 'اسم المقرر (مثال: CS411)' },
    group_desc_placeholder: { en: 'Brief project description...', tr: 'Kısa proje açıklaması...', de: 'Kurze Projektbeschreibung...', es: 'Breve descripción del proyecto...', fr: 'Brève description du projet...', it: 'Breve descrizione del progetto...', ru: 'Краткое описание проекта...', ko: '간단한 프로젝트 설명...', ja: '課題の簡単な説明...', ar: 'وصف موجز للمشروع...' },
    group_save_btn: { en: 'Save Project', tr: 'Projeyi Kaydet', de: 'Projekt speichern', es: 'Guardar Proyecto', fr: 'Enregistrer le Projet', it: 'Salva Progetto', ru: 'Сохранить проект', ko: '프로젝트 저장', ja: '課題を保存', ar: 'حفظ المشروع' },
    group_no_projects: { en: 'No group projects yet!', tr: 'Henüz grup projesi yok!', de: 'Noch keine Gruppenprojekte!', es: '¡Aún no hay proyectos grupales!', fr: 'Aucun projet de groupe pour l\'instant !', it: 'Nessun progetto di gruppo!', ru: 'Групповых проектов пока нет!', ko: '그룹 프로젝트가 아직 없습니다!', ja: 'グループ課題はまだありません！', ar: 'لا توجد مشاريع جماعية بعد!' },
    group_no_projects_tip: { en: 'Click "+ New Group Project" above to collaborate with classmates.', tr: 'Sınıf arkadaşlarınla ortak proje başlatmak için yukarıdaki butona tıkla.', de: 'Klicke oben auf "+ Neues Gruppenprojekt", um mit Kommilitonen zu starten.', es: 'Haz clic en "+ Nuevo Proyecto Grupal" para colaborar con compañeros.', fr: 'Cliquez sur "+ Nouveau Projet de Groupe" pour collaborer.', it: 'Clicca su "+ Nuovo Progetto di Gruppo" per collaborare.', ru: 'Нажмите "+ Новый групповой проект" для совместной работы.', ko: '친구들과 협업하려면 위의 "+ 새 그룹 프로젝트"를 클릭하세요.', ja: '上の「+ 新規グループ課題」をクリックして始めましょう。', ar: 'انقر فوق "+ مشروع جماعي جديد" أعلاه للتعاون مع زملائك.' },
    group_tasks_progress: { en: 'Tasks Progress', tr: 'Görev İlerlemesi', de: 'Aufgabenfortschritt', es: 'Progreso de Tareas', fr: 'Progression des Tâches', it: 'Avanzamento Compiti', ru: 'Прогресс задач', ko: '작업 진행률', ja: 'タスク進捗', ar: 'تقدم المهام' },
    group_view_subtasks: { en: 'View & Manage Subtasks', tr: 'Alt Görevleri Yönet', de: 'Teilaufgaben ansehen & verwalten', es: 'Ver y Gestionar Subtareas', fr: 'Voir et Gérer les Sous-tâches', it: 'Visualizza e Gestisci Sottocompiti', ru: 'Управление подзадачами', ko: '하위 작업 보기 및 관리', ja: 'サブタスクの確認・管理', ar: 'عرض وإدارة المهام الفرعية' },
    group_add_subtask_placeholder: { en: 'Add subtask (e.g. Prepare Slide 1-5)...', tr: 'Alt görev ekle (örn. 1-5 slaytları hazırla)...', de: 'Teilaufgabe hinzufügen (z.B. Folien 1-5 vorbereiten)...', es: 'Añadir subtarea (ej. Preparar diapositivas 1-5)...', fr: 'Ajouter sous-tâche (ex. Préparer diapositives 1-5)...', it: 'Aggiungi sottocompito (es. Prepara slide 1-5)...', ru: 'Добавить подзадачу (напр. Слайды 1-5)...', ko: '하위 작업 추가 (예: 슬라이드 1-5 준비)...', ja: 'サブタスクを追加 (例: スライド1-5の作成)...', ar: 'إضافة مهمة فرعية (مثال: إعداد الشرائح 1-5)...' },
    group_add_task_btn: { en: '+ Add Task', tr: '+ Görev Ekle', de: '+ Aufgabe hinzufügen', es: '+ Añadir Tarea', fr: '+ Ajouter Tâche', it: '+ Aggiungi Compito', ru: '+ Добавить задачу', ko: '+ 작업 추가', ja: '+ タスク追加', ar: '+ إضافة مهمة' },
    group_invite_btn: { en: '+ Invite', tr: '+ Davet Et', de: '+ Einladen', es: '+ Invitar', fr: '+ Inviter', it: '+ Invita', ru: '+ Пригласить', ko: '+ 초대', ja: '+ 招待', ar: '+ دعوة' },

    // AI Chat / Academic Coach
    ai_bubble_title: { en: 'Chat with AI Buddy (Draggable)', tr: 'AI Asistanla Sohbet Et (Sürüklenebilir)', de: 'Mit AI Buddy chatten (ziehbar)', es: 'Chatear con AI Buddy (arrastrable)', fr: 'Discuter avec AI Buddy (déplaçable)', it: 'Chatta con AI Buddy (trascinabile)', ru: 'Чат с AI Buddy (перетаскиваемый)', ko: 'AI 버디와 대화 (드래그 가능)', ja: 'AIバディとチャット (ドラッグ可能)', ar: 'المحادثة مع الزميل الذكي (قابل للسحب)' },
    ai_header_title: { en: 'AI Buddy', tr: 'AI Buddy', de: 'AI Buddy', es: 'AI Buddy', fr: 'AI Buddy', it: 'AI Buddy', ru: 'AI Buddy', ko: 'AI Buddy', ja: 'AI Buddy', ar: 'AI Buddy' },
    ai_drag_tip: { en: 'Hold & drag to move', tr: 'Taşımak için basılı tutup sürükleyin', de: 'Halten & ziehen zum Verschieben', es: 'Mantén presionado y arrastra', fr: 'Maintenir et glisser pour déplacer', it: 'Trascina per spostare', ru: 'Удерживайте для перемещения', ko: '길게 눌러 드래그하여 이동', ja: 'ドラッグして移動', ar: 'اضغط واسحب للتحريك' },
    ai_chip_1: { en: '👋 Hello, how are you?', tr: '👋 Selam, nasılsın?', de: '👋 Hallo, wie geht es dir?', es: '👋 ¡Hola! ¿Cómo estás?', fr: '👋 Bonjour, comment vas-tu ?', it: '👋 Ciao, come stai?', ru: '👋 Привет, как дела?', ko: '👋 안녕하세요, 잘 지내시나요?', ja: '👋 こんにちは、調子はどう？', ar: '👋 مرحباً، كيف حالك؟' },
    ai_chip_2: { en: '☕ How can I manage my study time?', tr: '☕ Çalışma süremi nasıl düzenleyebilirim?', de: '☕ Wie plane ich meine Lernzeit?', es: '☕ ¿Cómo gestiono mi tiempo de estudio?', fr: '☕ Comment gérer mon temps d\'étude ?', it: '☕ Come organizzo lo studio?', ru: '☕ Как распределить время на учебу?', ko: '☕ 공부 시간 관리는 어떻게 하나요?', ja: '☕ 勉強時間の管理はどうすればいい？', ar: '☕ كيف أنظم وقت المذاكرة؟' },
    ai_chip_3: { en: '🎯 Which course should I study most?', tr: '🎯 En çok hangi derse ağırlık vermeliyim?', de: '🎯 Welchen Kurs sollte ich lernen?', es: '🎯 ¿Qué materia debo repasar más?', fr: '🎯 Quel cours dois-je réviser en priorité ?', it: '🎯 Quale esame preparare prima?', ru: '🎯 К какому предмету готовиться?', ko: '🎯 어떤 과목을 먼저 공부해야 할까요?', ja: '🎯 どの科目から復習すべき？', ar: '🎯 ما هو المقرر الأهم للبدء به؟' },
    ai_chip_4: { en: '💻 Help me create a revision plan', tr: '💻 Bana bir tekrar programı hazırla', de: '💻 Erstelle einen Lernplan', es: '💻 Ayúdame a crear un plan de repaso', fr: '💻 Aide-moi à faire un planning', it: '💻 Crea un piano di ripasso', ru: '💻 Помоги составить план повторения', ko: '💻 복습 계획을 세워주세요', ja: '💻 復習スケジュールを作って', ar: '💻 ساعدني في وضع جدول مراجعة' },
    ai_welcome_msg: {
        en: 'Hello! I am your AI Study Buddy. Feel free to ask anything about your courses, upcoming exams, or study schedule! 😊',
        tr: 'Selam! Ben senin AI Çalışma Arkadaşınım. Derslerin, yaklaşan sınavların veya çalışma programınla ilgili dilediğin her şeyi sorabilirsin! 😊',
        de: 'Hallo! Ich bin dein AI-Lernpartner. Frag mich alles zu deinen Kursen oder Prüfungen! 😊',
        es: '¡Hola! Soy tu compañero de estudio con IA. ¡Pregúntame cualquier duda sobre tus cursos o exámenes! 😊',
        fr: 'Bonjour ! Je suis ton compagnon d\'étude IA. Pose-moi toutes tes questions sur tes cours ou révisions ! 😊',
        it: 'Ciao! Sono il tuo compagno di studio AI. Chiedimi qualsiasi cosa sui tuoi corsi o esami! 😊',
        ru: 'Привет! Я твой академический ИИ-помощник. Задавай любые вопросы по учебе и экзаменам! 😊',
        ko: '안녕하세요! 저는 AI 스터디 버디입니다. 과목이나 시험에 대해 무엇이든 물어보세요! 😊',
        ja: 'こんにちは！AIスタディ仲間です。授業や試験について何でも聞いてくださいね！😊',
        ar: 'مرحباً! أنا زميلك الذكي للمذاكرة. لا تتردد في سؤالي عن أي مقرر أو اختبار! 😊'
    },
    ai_input_placeholder: { en: 'Type a message or ask something...', tr: 'Bir mesaj yaz veya soru sor...', de: 'Nachricht eingeben oder Frage stellen...', es: 'Escribe un mensaje o pregunta algo...', fr: 'Tapez un message ou posez une question...', it: 'Scrivi un messaggio o fai una domanda...', ru: 'Введите сообщение или задайте вопрос...', ko: '메시지를 입력하거나 질문하세요...', ja: 'メッセージを入力または質問...', ar: 'اكتب رسالة أو اطرح سؤالاً...' },
    ai_typing: { en: 'AI is thinking...', tr: 'AI düşünüyor...', de: 'AI denkt nach...', es: 'La IA está pensando...', fr: 'L\'IA réfléchit...', it: 'L\'IA sta pensando...', ru: 'ИИ думает...', ko: 'AI가 생각 중입니다...', ja: 'AIが考え中...', ar: 'الذكاء الاصطناعي يفكر...' },
    ai_cleared_msg: { en: 'Chat cleared. How can I help you today? 😊', tr: 'Sohbet temizlendi. Bugün sana nasıl yardımcı olabilirim? 😊', de: 'Chat gelöscht. Wie kann ich heute helfen? 😊', es: 'Chat borrado. ¿En qué te puedo ayudar hoy? 😊', fr: 'Discussion effacée. Comment puis-je vous aider ? 😊', it: 'Chat cancellata. Come posso aiutarti oggi? 😊', ru: 'Чат очищен. Чем могу помочь? 😊', ko: '대화가 초기화되었습니다. 무엇을 도와드릴까요? 😊', ja: 'チャットがリセットされました。何かお手伝いできますか？😊', ar: 'تم مسح المحادثة. كيف يمكنني مساعدتك اليوم؟ 😊' },
    ai_clear_chat_tip: { en: 'Clear Chat', tr: 'Sohbeti Temizle', de: 'Chat löschen', es: 'Limpiar Chat', fr: 'Effacer la discussion', it: 'Cancella Chat', ru: 'Очистить чат', ko: '대화 초기화', ja: 'チャットを消去', ar: 'مسح المحادثة' },
    ai_send_tip: { en: 'Send', tr: 'Gönder', de: 'Senden', es: 'Enviar', fr: 'Envoyer', it: 'Invia', ru: 'Отправить', ko: '전송', ja: '送信', ar: 'إرسال' },

    // Settings Page
    settings_title: { en: 'Settings', tr: 'Ayarlar', de: 'Einstellungen', es: 'Configuración', fr: 'Paramètres', it: 'Impostazioni', ru: 'Настройки', ko: '설정', ja: '設定', ar: 'الإعدادات' },
    settings_subtitle: {
        en: 'Manage your profile information, avatar, language, and preferences.',
        tr: 'Profil bilgilerinizi, avatarınızı, dil tercihinizi ve hesap detaylarınızı yönetin.',
        de: 'Verwalte Profilinformationen, Avatar, Sprache und Einstellungen.',
        es: 'Administra tu perfil, avatar, idioma y preferencias.',
        fr: 'Gérez vos informations de profil, avatar, langue et préférences.',
        it: 'Gestisci le informazioni del profilo, avatar, lingua e preferenze.',
        ru: 'Управляйте данными профиля, аватаром, языком и настройками.',
        ko: '프로필 정보, 아바타, 언어 및 환경설정을 관리하세요.',
        ja: 'プロフィール情報、アバター、言語、環境設定を管理します。',
        ar: 'إدارة معلومات ملفك الشخصي، الصورة الرمزية، اللغة والتفضيلات.'
    },
    settings_avatar_title: { en: 'Profile Avatar', tr: 'Profil Avatarı', de: 'Profil-Avatar', es: 'Avatar del Perfil', fr: 'Avatar du Profil', it: 'Avatar del Profilo', ru: 'Аватар профиля', ko: '프로필 아바타', ja: 'プロフィールアバター', ar: 'الصورة الرمزية للملف الشخصي' },
    settings_avatar_desc: {
        en: 'Choose an avatar from the gallery below or click "+" to upload your own custom photo.',
        tr: 'Aşağıdaki galeriden bir avatar seçin veya kendi fotoğrafınızı yüklemek için "+" butonuna tıklayın.',
        de: 'Wähle einen Avatar aus der Galerie oder klicke auf "+", um ein eigenes Foto hochzuladen.',
        es: 'Elige un avatar de la galería o haz clic en "+" para subir tu propia foto.',
        fr: 'Choisissez un avatar dans la galerie ou cliquez sur "+" pour ajouter votre photo.',
        it: 'Scegli un avatar dalla galleria o clicca "+" per caricare la tua foto.',
        ru: 'Выберите аватар из галереи или нажмите "+", чтобы загрузить свое фото.',
        ko: '갤러리에서 아바타를 선택하거나 "+"를 눌러 직접 사진을 업로드하세요.',
        ja: 'ギャラリーからアバターを選択するか、「+」を押して写真をアップロードしてください。',
        ar: 'اختر صورة رمزية من المعرض أدناه أو انقر فوق "+" لتحميل صورتك الخاصة.'
    },
    settings_avatar_gallery: { en: 'Gallery', tr: 'Galeri', de: 'Galerie', es: 'Galería', fr: 'Galerie', it: 'Galleria', ru: 'Галерея', ko: '갤러리', ja: 'ギャラリー', ar: 'المعرض' },
    settings_avatar_custom: { en: 'Custom', tr: 'Özel', de: 'Eigene', es: 'Personal', fr: 'Personnalisé', it: 'Personalizzato', ru: 'Свое', ko: '직접 업로드', ja: 'カスタム', ar: 'مخصص' },
    settings_avatar_reset: { en: 'Reset to Default', tr: 'Varsayılana Sıfırla', de: 'Zurücksetzen', es: 'Restablecer', fr: 'Réinitialiser', it: 'Ripristina', ru: 'По умолчанию', ko: '기본값으로 초기화', ja: '初期値に戻す', ar: 'إعادة ضبط للافتراضي' },
    settings_personal_info_title: { en: 'Personal Information', tr: 'Kişisel Bilgiler', de: 'Persönliche Angaben', es: 'Información Personal', fr: 'Informations Personnelles', it: 'Informazioni Personali', ru: 'Личные данные', ko: '개인 정보', ja: '個人情報', ar: 'المعلومات الشخصية' },
    settings_personal_title: { en: 'Personal Information', tr: 'Kişisel Bilgiler', de: 'Persönliche Angaben', es: 'Información Personal', fr: 'Informations Personnelles', it: 'Informazioni Personali', ru: 'Личные данные', ko: '개인 정보', ja: '個人情報', ar: 'المعلومات الشخصية' },
    settings_personal_info_desc: {
        en: 'Update your display name, department, academic grade and email address.',
        tr: 'Görünen adınızı, bölümünüzü, sınıfınızı ve e-posta adresinizi güncelleyin.',
        de: 'Aktualisiere Anzeigename, Studiengang, Semester und E-Mail.',
        es: 'Actualiza tu nombre, departamento, curso y correo electrónico.',
        fr: 'Mettez à jour votre nom, filière, niveau d\'études et e-mail.',
        it: 'Aggiorna nome visualizzato, corso, anno di corso ed email.',
        ru: 'Обновите имя, специальность, курс и email.',
        ko: '이름, 학과, 학년 및 이메일 주소를 업데이트하세요.',
        ja: '表示名、学科、学年、メールアドレスを更新します。',
        ar: 'تحديث اسم العرض والقسم والسنة الدراسية والبريد الإلكتروني.'
    },
    settings_personal_desc: {
        en: 'Update your display name, email address, academic grade and department.',
        tr: 'Görünen adınızı, e-posta adresinizi, sınıfınızı ve bölümünüzü güncelleyin.',
        de: 'Aktualisiere Anzeigename, E-Mail, Semester und Fachbereich.',
        es: 'Actualiza tu nombre, correo, curso y especialidad.',
        fr: 'Mettez à jour votre nom, e-mail, niveau et filière.',
        it: 'Aggiorna nome, email, anno e corso.',
        ru: 'Обновите имя, email, курс и специальность.',
        ko: '이름, 이메일 주소, 학년 및 학과를 업데이트하세요.',
        ja: '表示名、メールアドレス、学年、学科を更新します。',
        ar: 'تحديث اسم العرض والبريد الإلكتروني والسنة الدراسية والقسم.'
    },
    settings_fullname: { en: 'Full Name', tr: 'Ad Soyad', de: 'Vollständiger Name', es: 'Nombre Completo', fr: 'Nom Complet', it: 'Nome e Cognome', ru: 'Полное имя', ko: '이름', ja: '氏名', ar: 'الاسم الكامل' },
    settings_email: { en: 'Email Address', tr: 'E-posta Adresi', de: 'E-Mail-Adresse', es: 'Correo Electrónico', fr: 'Adresse E-mail', it: 'Indirizzo Email', ru: 'Электронная почта', ko: '이메일 주소', ja: 'メールアドレス', ar: 'البريد الإلكتروني' },
    settings_grade: { en: 'Class / Year', tr: 'Sınıf / Yıl', de: 'Klasse / Jahr', es: 'Curso / Año', fr: 'Classe / Année', it: 'Classe / Anno', ru: 'Курс', ko: '학년', ja: '学年', ar: 'السنة الدراسية' },
    settings_department: { en: 'Department / Major', tr: 'Bölüm', de: 'Fachbereich / Studiengang', es: 'Carrera / Especialidad', fr: 'Filière / Département', it: 'Corso di Laurea', ru: 'Специальность', ko: '학과 / 전공', ja: '学部・学科', ar: 'القسم' },
    settings_change_password: { en: 'Change Password', tr: 'Şifre Değiştir', de: 'Passwort ändern', es: 'Cambiar Contraseña', fr: 'Changer le Mot de Passe', it: 'Cambia Password', ru: 'Сменить пароль', ko: '비밀번호 변경', ja: 'パスワード変更', ar: 'تغيير كلمة المرور' },
    settings_curr_password: { en: 'Current Password', tr: 'Mevcut Şifre', de: 'Aktuelles Passwort', es: 'Contraseña Actual', fr: 'Mot de Passe Actuel', it: 'Password Attuale', ru: 'Текущий пароль', ko: '현재 비밀번호', ja: '現在のパスワード', ar: 'كلمة المرور الحالية' },
    settings_new_password: { en: 'New Password', tr: 'Yeni Şifre', de: 'Neues Passwort', es: 'Nueva Contraseña', fr: 'Nouveau Mot de Passe', it: 'Nuova Password', ru: 'Новый пароль', ko: '새 비밀번호', ja: '新しいパスワード', ar: 'كلمة المرور الجديدة' },
    settings_save_btn: { en: 'Save Profile Changes', tr: 'Profil Değişikliklerini Kaydet', de: 'Profil speichern', es: 'Guardar Cambios', fr: 'Enregistrer le Profil', it: 'Salva Modifiche', ru: 'Сохранить профиль', ko: '프로필 저장', ja: 'プロフィールを保存', ar: 'حفظ التغييرات' },
    settings_danger_title: { en: 'Danger Zone', tr: 'Tehlikeli Bölge', de: 'Gefahrenzone', es: 'Zona de Peligro', fr: 'Zone Dangereuse', it: 'Zona di Pericolo', ru: 'Опасная зона', ko: '위험 구역', ja: '危険ゾーン', ar: 'منطقة الخطر' },
    settings_danger_desc: { en: 'Permanently delete your account and all associated academic data.', tr: 'Hesabınızı ve tüm akademik verilerinizi kalıcı olarak silin.', de: 'Lösche dein Konto und alle Daten unwiderruflich.', es: 'Elimina permanentemente tu cuenta y todos tus datos.', fr: 'Supprimez définitivement votre compte et vos données.', it: 'Elimina definitivamente il tuo account e tutti i dati.', ru: 'Удалить аккаунт и все данные навсегда.', ko: '계정과 모든 학업 데이터를 영구적으로 삭제합니다.', ja: 'アカウントとすべてのデータを完全に削除します。', ar: 'حذف حسابك وجميع بياناتك بشكل دائم.' },
    settings_delete_btn: { en: 'Delete Account', tr: 'Hesabımı Sil', de: 'Konto löschen', es: 'Eliminar Cuenta', fr: 'Supprimer le Compte', it: 'Elimina Account', ru: 'Удалить аккаунт', ko: '계정 삭제', ja: 'アカウントを削除', ar: 'حذف الحساب' },
    settings_lang_title: { en: 'Language & Region', tr: 'Dil ve Bölge', de: 'Sprache & Region', es: 'Idioma y Región', fr: 'Langue et Région', it: 'Lingua e Regione', ru: 'Язык и регион', ko: '언어 및 지역', ja: '言語と地域', ar: 'اللغة والمنطقة' },
    settings_lang_desc: {
        en: 'Choose your preferred language for all interface elements and notifications.',
        tr: 'Tüm arayüz ve bildirimler için kullanmak istediğiniz dili seçin.',
        de: 'Wähle deine bevorzugte Sprache für alle Schnittstellen und Benachrichtigungen.',
        es: 'Elige tu idioma preferido para toda la interfaz y notificaciones.',
        fr: 'Sélectionnez votre langue pour l\'ensemble de l\'interface et des alertes.',
        it: 'Seleziona la tua lingua preferita per l\'interfaccia e le notifiche.',
        ru: 'Выберите язык интерфейса и уведомлений.',
        ko: '모든 인터페이스와 알림에 사용할 언어를 선택하세요.',
        ja: 'インターフェースと通知で使用する言語を選択してください。',
        ar: 'اختر لغتك المفضلة لجميع عناصر الواجهة والإشعارات.'
    },
    settings_select_lang_label: { en: 'Select Language', tr: 'Dil Seçin', de: 'Sprache auswählen', es: 'Seleccionar Idioma', fr: 'Choisir la Langue', it: 'Seleziona Lingua', ru: 'Выберите язык', ko: '언어 선택', ja: '言語を選択', ar: 'اختر اللغة' },
    settings_save_profile_btn: { en: 'Save Profile Changes', tr: 'Profil Değişikliklerini Kaydet', de: 'Profil speichern', es: 'Guardar Cambios del Perfil', fr: 'Enregistrer le Profil', it: 'Salva Modifiche Profilo', ru: 'Сохранить профиль', ko: '프로필 변경사항 저장', ja: 'プロフィールを保存', ar: 'حفظ تغييرات الملف الشخصي' },
    settings_account_security_title: { en: 'Account & Security', tr: 'Hesap ve Güvenlik', de: 'Konto & Sicherheit', es: 'Cuenta y Seguridad', fr: 'Compte & Sécurité', it: 'Account e Sicurezza', ru: 'Аккаунт и безопасность', ko: '계정 및 보안', ja: 'アカウントとセキュリティ', ar: 'الحساب والأمان' },
    settings_account_security_desc: {
        en: 'Manage your password and security settings.',
        tr: 'Şifrenizi ve güvenlik tercihlerinizi yönetin.',
        de: 'Verwalte dein Passwort und Sicherheitseinstellungen.',
        es: 'Gestiona tu contraseña y ajustes de seguridad.',
        fr: 'Gérez votre mot de passe et vos paramètres de sécurité.',
        it: 'Gestisci la password e le impostazioni di sicurezza.',
        ru: 'Управляйте паролем и параметрами безопасности.',
        ko: '비밀번호 및 보안 설정을 관리하세요.',
        ja: 'パスワードとセキュリティ設定を管理します。',
        ar: 'إدارة كلمة المرور وإعدادات الأمان الخاصة بك.'
    },

    // Toasts & Notifications
    toast_lang_changed: { en: 'Language updated successfully.', tr: 'Dil başarıyla güncellendi.', de: 'Sprache erfolgreich aktualisiert.', es: 'Idioma actualizado correctamente.', fr: 'Langue mise à jour avec succès.', it: 'Lingua aggiornata con successo.', ru: 'Язык успешно обновлен.', ko: '언어가 성공적으로 변경되었습니다.', ja: '言語が正常に更新されました。', ar: 'تم تحديث اللغة بنجاح.' },
    toast_theme_changed: { en: 'Theme updated successfully!', tr: 'Tema başarıyla güncellendi!', de: 'Theme erfolgreich aktualisiert!', es: '¡Tema actualizado con éxito!', fr: 'Thème mis à jour avec succès !', it: 'Tema aggiornato con successo!', ru: 'Тема успешно обновлена!', ko: '테마가 성공적으로 변경되었습니다!', ja: 'テーマが正常に更新されました！', ar: 'تم تحديث السمة بنجاح!' },
    toast_profile_saved: { en: 'Profile changes saved successfully.', tr: 'Profil değişiklikleri başarıyla kaydedildi.', de: 'Profil erfolgreich gespeichert.', es: 'Perfil guardado con éxito.', fr: 'Profil mis à jour.', it: 'Profilo salvato con successo.', ru: 'Профиль сохранен.', ko: '프로필이 저장되었습니다.', ja: 'プロフィールが保存されました。', ar: 'تم حفظ الملف الشخصي بنجاح.' },
    toast_course_saved: { en: 'Course saved successfully.', tr: 'Ders başarıyla kaydedildi.', de: 'Kurs erfolgreich gespeichert.', es: 'Curso guardado con éxito.', fr: 'Cours enregistré.', it: 'Corso salvato con successo.', ru: 'Курс сохранен.', ko: '과목이 저장되었습니다.', ja: '科目を保存しました。', ar: 'تم حفظ المقرر بنجاح.' },
    toast_exam_saved: { en: 'Exam deadline saved successfully.', tr: 'Sınav tarihi başarıyla kaydedildi.', de: 'Prüfungstermin gespeichert.', es: 'Examen guardado.', fr: 'Échéance d\'examen enregistrée.', it: 'Scadenza esame salvata.', ru: 'Экзамен сохранен.', ko: '시험 일정이 저장되었습니다.', ja: '試験日程を保存しました。', ar: 'تم حفظ موعد الاختبار بنجاح.' },
    toast_session_saved: { en: 'Study session saved successfully.', tr: 'Çalışma seansı başarıyla kaydedildi.', de: 'Lerneinheit gespeichert.', es: 'Sesión guardada con éxito.', fr: 'Session enregistrée.', it: 'Sessione salvata.', ru: 'Сессия сохранена.', ko: '학습 세션이 저장되었습니다.', ja: '学習セッションを保存しました。', ar: 'تم حفظ جلسة المذاكرة بنجاح.' },

    // Clean Old Records
    toast_no_old_completed_exams: { en: 'No completed exams older than 3 months found.', tr: '3 aydan eski tamamlanmış sınav kaydı bulunamadı.', de: 'Keine abgeschlossenen Prüfungen älter als 3 Monate gefunden.', es: 'No se encontraron exámenes completados de más de 3 meses.', fr: 'Aucun examen terminé de plus de 3 mois trouvé.', it: 'Nessun esame completato più vecchio di 3 mesi trovato.', ru: 'Завершенных экзаменов старше 3 месяцев не найдено.', ko: '3개월 이상 지난 완료된 시험 일정이 없습니다.', ja: '3か月以上前の完了した試験は見つかりませんでした。', ar: 'لم يتم العثور على اختبارات مكتملة أقدم من 3 أشهر.' },
    toast_no_old_completed_projects: { en: 'No completed projects older than 3 months found.', tr: '3 aydan eski tamamlanmış proje kaydı bulunamadı.', de: 'Keine abgeschlossenen Projekte älter als 3 Monate gefunden.', es: 'No se encontraron proyectos completados de más de 3 meses.', fr: 'Aucun projet terminé de plus de 3 mois trouvé.', it: 'Nessun progetto completato più vecchio di 3 mesi trovato.', ru: 'Завершенных проектов старше 3 месяцев не найдено.', ko: '3개월 이상 지난 완료된 프로젝트가 없습니다.', ja: '3か月以上前の完了したプロジェクトは見つかりませんでした。', ar: 'لم يتم العثور على مشاريع مكتملة أقدم من 3 أشهر.' },
    toast_no_old_completed_activities: { en: 'No completed activities older than 3 months found.', tr: '3 aydan eski tamamlanmış aktivite kaydı bulunamadı.', de: 'Keine abgeschlossenen Aktivitäten älter als 3 Monate gefunden.', es: 'No se encontraron actividades completadas de más de 3 meses.', fr: 'Aucune activité terminée de plus de 3 mois trouvée.', it: 'Nessuna attività completata più vecchia di 3 mesi trovata.', ru: 'Завершенных заданий старше 3 месяцев не найдено.', ko: '3개월 이상 지난 완료된 활동이 없습니다.', ja: '3か月以上前の完了したアクティビティは見つかりませんでした。', ar: 'لم يتم العثور على أنشطة مكتملة أقدم من 3 أشهر.' },

    confirm_clean_old_exams_title: { en: 'Delete Old Completed Exams', tr: 'Eski Tamamlanan Sınavları Sil', de: 'Alte abgeschlossene Prüfungen löschen', es: 'Eliminar exámenes antiguos completados', fr: 'Supprimer les anciens examens terminés', it: 'Elimina vecchi esami completati', ru: 'Удалить старые завершенные экзамены', ko: '오래된 완료 시험 삭제', ja: '古い完了済み試験の削除', ar: 'حذف الاختبارات المكتملة القديمة' },
    confirm_clean_old_exams_msg: { en: '{n} completed exams older than 3 months will be permanently deleted. Are you sure you want to delete them?', tr: '3 aydan eski {n} tamamlanmış sınav kaydı kalıcı olarak silinecek. Silmek istediğinizden emin misiniz?', de: '{n} abgeschlossene Prüfungen älter als 3 Monate werden dauerhaft gelöscht. Möchtest du sie wirklich löschen?', es: 'Se eliminarán permanentemente {n} exámenes completados de más de 3 meses. ¿Estás seguro de eliminarlos?', fr: '{n} examens terminés de plus de 3 mois seront définitivement supprimés. Voulez-vous vraiment les supprimer ?', it: '{n} esami completati più vecchi di 3 mesi verranno eliminati definitivamente. Sei sicuro di volerli eliminare?', ru: '{n} завершенных экзаменов старше 3 месяцев будут безвозвратно удалены. Вы уверены, что хотите удалить их?', ko: '3개월 이상 지난 {n}개의 완료된 시험이 영구적으로 삭제됩니다. 삭제하시겠습니까?', ja: '3か月以上前の完了した{n}件の試験が完全に削除されます。削除してもよろしいですか？', ar: 'سيتم حذف {n} من الاختبارات المكتملة أقدم من 3 أشهر نهائياً. هل أنت متأكد من رغبتك في حذفها؟' },

    confirm_clean_old_projects_title: { en: 'Delete Old Completed Projects', tr: 'Eski Tamamlanan Projeleri Sil', de: 'Alte abgeschlossene Projekte löschen', es: 'Eliminar proyectos antiguos completados', fr: 'Supprimer les anciens projets terminés', it: 'Elimina vecchi progetti completati', ru: 'Удалить старые завершенные проекты', ko: '오래된 완료 프로젝트 삭제', ja: '古い完了済みプロジェクトの削除', ar: 'حذف المشاريع المكتملة القديمة' },
    confirm_clean_old_projects_msg: { en: '{n} completed projects older than 3 months will be permanently deleted. Are you sure you want to delete them?', tr: '3 aydan eski {n} tamamlanmış proje kaydı kalıcı olarak silinecek. Silmek istediğinizden emin misiniz?', de: '{n} abgeschlossene Projekte älter als 3 Monate werden dauerhaft gelöscht. Möchtest du sie wirklich löschen?', es: 'Se eliminarán permanentemente {n} proyectos completados de más de 3 meses. ¿Estás seguro de eliminarlos?', fr: '{n} projets terminés de plus de 3 mois seront définitivement supprimés. Voulez-vous vraiment les supprimer ?', it: '{n} progetti completati più vecchi di 3 mesi verranno eliminati definitivamente. Sei sicuro di volerli eliminare?', ru: '{n} завершенных проектов старше 3 месяцев будут безвозвратно удалены. Вы уверены, что хотите удалить их?', ko: '3개월 이상 지난 {n}개의 완료된 프로젝트가 영구적으로 삭제됩니다. 삭제하시겠습니까?', ja: '3か月以上前の完了した{n}件の課題が完全に削除されます。削除してもよろしいですか？', ar: 'سيتم حذف {n} من المشاريع المكتملة أقدم من 3 أشهر نهائياً. هل أنت متأكد من رغبتك في حذفها؟' },

    confirm_clean_old_activities_title: { en: 'Delete Old Completed Activities', tr: 'Eski Tamamlanan Aktiviteleri Sil', de: 'Alte abgeschlossene Aktivitäten löschen', es: 'Eliminar actividades antiguas completadas', fr: 'Supprimer les anciennes activités terminées', it: 'Elimina vecchie attività completate', ru: 'Удалить старые завершенные задания', ko: '오래된 완료 활동 삭제', ja: '古い完了済みアクティビティの削除', ar: 'حذف الأنشطة المكتملة القديمة' },
    confirm_clean_old_activities_msg: { en: '{n} completed activities older than 3 months will be permanently deleted. Are you sure you want to delete them?', tr: '3 aydan eski {n} tamamlanmış aktivite kaydı kalıcı olarak silinecek. Silmek istediğinizden emin misiniz?', de: '{n} abgeschlossene Aktivitäten älter als 3 Monate werden dauerhaft gelöscht. Möchtest du sie wirklich löschen?', es: 'Se eliminarán permanentemente {n} actividades completadas de más de 3 meses. ¿Estás seguro de eliminarlas?', fr: '{n} activités terminées de plus de 3 mois seront définitivement supprimés. Voulez-vous vraiment les supprimer ?', it: '{n} attività completate più vecchie di 3 mesi verranno eliminate definitivamente. Sei sicuro di volerle eliminare?', ru: '{n} завершенных заданий старше 3 месяцев будут безвозвратно удалены. Вы уверены, что хотите удалить их?', ko: '3개월 이상 지난 {n}개의 완료된 활동이 영구적으로 삭제됩니다. 삭제하시겠습니까?', ja: '3か月以上前の完了した{n}件のアクティビティが完全に削除されます。削除してもよろしいですか？', ar: 'سيتم حذف {n} من الأنشطة المكتملة أقدم من 3 أشهر نهائياً. هل أنت متأكد من رغبتك في حذفها؟' },

    // Single Deletions
    confirm_delete_exam_title: { en: 'Delete Exam', tr: 'Sınavı Sil', de: 'Prüfung löschen', es: 'Eliminar Examen', fr: 'Supprimer l\'Examen', it: 'Elimina Esame', ru: 'Удалить экзамен', ko: '시험 삭제', ja: '試験を削除', ar: 'حذف الاختبار' },
    confirm_delete_exam_msg: { en: 'Are you sure you want to delete this exam? This action cannot be undone.', tr: 'Bu sınavı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', de: 'Möchtest du diese Prüfung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.', es: '¿Estás seguro de que deseas eliminar este examen? Esta acción no se puede deshacer.', fr: 'Êtes-vous sûr de vouloir supprimer cet examen ? Cette action est irréversible.', it: 'Sei sicuro di voler eliminare questo esame? Questa azione non può essere annullata.', ru: 'Вы уверены, что хотите удалить этот экзамен? Это действие нельзя отменить.', ko: '이 시험을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.', ja: 'この試験を削除してもよろしいですか？この操作は取り消せません。', ar: 'هل أنت متأكد من رغبتك في حذف هذا الاختبار؟ لا يمكن التراجع عن هذا الإجراء.' },

    confirm_delete_project_title: { en: 'Delete Project', tr: 'Projeyi Sil', de: 'Projekt löschen', es: 'Eliminar Proyecto', fr: 'Supprimer le Projet', it: 'Elimina Progetto', ru: 'Удалить проект', ko: '프로젝트 삭제', ja: '課題を削除', ar: 'حذف المشروع' },
    confirm_delete_project_msg: { en: 'Are you sure you want to delete this project? This action cannot be undone.', tr: 'Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', de: 'Möchtest du dieses Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.', es: '¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.', fr: 'Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.', it: 'Sei sicuro di voler eliminare questo progetto? Questa azione non può essere annullata.', ru: 'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.', ko: '이 프로젝트를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.', ja: 'この課題を削除してもよろしいですか？この操作は取り消せません。', ar: 'هل أنت متأكد من رغبتك في حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.' },

    confirm_delete_activity_title: { en: 'Delete Activity', tr: 'Aktiviteyi Sil', de: 'Aktivität löschen', es: 'Eliminar Actividad', fr: 'Supprimer l\'Activité', it: 'Elimina Attività', ru: 'Удалить задание', ko: '활동 삭제', ja: 'アクティビティを削除', ar: 'حذف النشاط' },
    confirm_delete_activity_msg: { en: 'Are you sure you want to delete this activity? This action cannot be undone.', tr: 'Bu aktiviteyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', de: 'Möchtest du diese Aktivität wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.', es: '¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.', fr: 'Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible.', it: 'Sei sicuro di voler eliminare questa attività? Questa azione non può essere annullata.', ru: 'Вы уверены, что хотите удалить это задание? Это действие нельзя отменить.', ko: '이 활동을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.', ja: 'このアクティビティを削除してもよろしいですか？この操作は取り消せません。', ar: 'هل أنت متأكد من رغبتك في حذف هذا النشاط؟ لا يمكن التراجع عن هذا الإجراء.' },

    confirm_delete_course_title: { en: 'Delete Course', tr: 'Dersi Sil', de: 'Kurs löschen', es: 'Eliminar Curso', fr: 'Supprimer le Cours', it: 'Elimina Corso', ru: 'Удалить курс', ko: '과목 삭제', ja: '科目を削除', ar: 'حذف المقرر' },
    confirm_delete_course_msg: { en: 'Are you sure you want to delete "{name}"? This action cannot be undone.', tr: '"{name}" dersini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', de: 'Möchtest du den Kurs "{name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.', es: '¿Estás seguro de que deseas eliminar "{name}"? Esta acción no se puede deshacer.', fr: 'Êtes-vous sûr de vouloir supprimer le cours "{name}" ? Cette action est irréversible.', it: 'Sei sicuro di voler eliminare il corso "{name}"? Questa azione non può essere annullata.', ru: 'Вы уверены, что хотите удалить курс "{name}"? Это действие нельзя отменить.', ko: '"{name}" 과목을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.', ja: '「{name}」を削除してもよろしいですか？この操作は取り消せません。', ar: 'هل أنت متأكد من رغبتك في حذف مقرر "{name}"؟ لا يمكن التراجع عن هذا الإجراء.' },

    confirm_delete_note_title: { en: 'Delete Note', tr: 'Notu Sil', de: 'Notiz löschen', es: 'Eliminar Nota', fr: 'Supprimer la Note', it: 'Elimina Nota', ru: 'Удалить заметку', ko: '메모 삭제', ja: 'メモを削除', ar: 'حذف الملاحظة' },
    confirm_delete_note_msg: { en: 'Are you sure you want to delete this note?', tr: 'Bu notu silmek istediğinizden emin misiniz?', de: 'Möchtest du diese Notiz wirklich löschen?', es: '¿Estás seguro de que deseas eliminar esta nota?', fr: 'Êtes-vous sûr de vouloir supprimer cette note ?', it: 'Sei sicuro di voler eliminare questa nota?', ru: 'Вы уверены, что хотите удалить эту заметку?', ko: '이 메모를 삭제하시겠습니까?', ja: 'このメモを削除してもよろしいですか？', ar: 'هل أنت متأكد من رغبتك في حذف هذه الملاحظة؟' },

    confirm_delete_session_title: { en: 'Delete Study Session', tr: 'Çalışma Seansını Sil', de: 'Lerneinheit löschen', es: 'Eliminar Sesión de Estudio', fr: 'Supprimer la Session d\'Étude', it: 'Elimina Sessione di Studio', ru: 'Удалить учебную сессию', ko: '학습 세션 삭제', ja: '学習記録を削除', ar: 'حذف جلسة المذاكرة' },
    confirm_delete_session_msg: { en: 'Are you sure you want to delete this study session? This action cannot be undone.', tr: 'Bu çalışma seansını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', de: 'Möchtest du diese Lerneinheit wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.', es: '¿Estás seguro de que deseas eliminar esta sesión de estudio? Esta acción no se puede deshacer.', fr: 'Êtes-vous sûr de vouloir supprimer cette session d\'étude ? Cette action est irréversible.', it: 'Sei sicuro di voler eliminare questa sessione di studio? Questa azione non può essere annullata.', ru: 'Вы уверены, что хотите удалить эту сессию? Это действие нельзя отменить.', ko: '이 학습 세션을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.', ja: 'この学習記録を削除してもよろしいですか？この操作は取り消せません。', ar: 'هل أنت متأكد من رغبتك في حذف جلسة المذاكرة هذه؟ لا يمكن التراجع عن هذا الإجراء.' },

    btn_confirm_delete: { en: 'Yes, delete', tr: 'Evet, sil', de: 'Ja, löschen', es: 'Sí, eliminar', fr: 'Oui, supprimer', it: 'Sì, elimina', ru: 'Да, удалить', ko: '예, 삭제합니다', ja: 'はい、削除します', ar: 'نعم، احذف' },
    toast_stale_records_deleted: { en: '{n} old completed {kind} deleted.', tr: '{n} eski tamamlanmış {kind} silindi.', de: '{n} alte abgeschlossene {kind} gelöscht.', es: '{n} {kind} antiguos completados eliminados.', fr: '{n} anciens {kind} terminés supprimés.', it: '{n} vecchi {kind} completati eliminati.', ru: '{n} старых завершенных {kind} удалено.', ko: '{n}개의 오래된 완료 {kind}이(가) 삭제되었습니다.', ja: '{n}件の古い完了した{kind}を削除しました。', ar: 'تم حذف {n} من {kind} المكتملة القديمة.' },
    toast_old_records_delete_err: { en: 'Old completed records could not be deleted.', tr: 'Eski tamamlanmış kayıtlar silinemedi.', de: 'Alte Einträge konnten nicht gelöscht werden.', es: 'No se pudieron eliminar los registros antiguos.', fr: 'Impossible de supprimer les anciens enregistrements.', it: 'Impossibile eliminare i vecchi record.', ru: 'Не удалось удалить старые записи.', ko: '오래된 완료 항목을 삭제할 수 없습니다.', ja: '古い完了記録を削除できませんでした。', ar: 'تعذر حذف السجلات القديمة.' },
    toast_activity_required: { en: 'Course, title and due date are required.', tr: 'Ders, başlık ve teslim tarihi zorunludur.', de: 'Kurs, Titel und Abgabedatum sind erforderlich.', es: 'El curso, el título y la fecha límite son obligatorios.', fr: 'Le cours, le titre et la date sont obligatoires.', it: 'Corso, titolo e data sono obbligatori.', ru: 'Курс, название и срок обязательны.', ko: '과목, 제목 및 마감일은 필수입니다.', ja: '科目、タイトル、締切日は必須です。', ar: 'المقرر والعنوان وتاريخ التسليم مطلوبة.' },
    toast_exam_required: { en: 'Course, instructor name, date and exam type are required.', tr: 'Ders, eğitmen adı, tarih ve sınav türü zorunludur.', de: 'Kurs, Dozent, Datum und Prüfungstyp erforderlich.', es: 'Curso, instructor, fecha y tipo de examen son obligatorios.', fr: 'Cours, enseignant, date et type d\'examen obligatoires.', it: 'Corso, docente, data e tipo esame obbligatori.', ru: 'Курс, преподаватель, дата и тип экзамена обязательны.', ko: '과목, 교수명, 날짜 및 시험 유형은 필수입니다.', ja: '科目、担当教員、日程、試験種別は必須です。', ar: 'المقرر واسم المدرس والتاريخ ونوع الاختبار مطلوبة.' },
    toast_project_required: { en: 'Course, project topic and due date are required.', tr: 'Ders, proje konusu ve teslim tarihi zorunludur.', de: 'Kurs, Projektthema und Abgabedatum erforderlich.', es: 'Curso, tema del proyecto y fecha límite obligatorios.', fr: 'Cours, sujet et date limite obligatoires.', it: 'Corso, argomento e data di consegna obbligatori.', ru: 'Курс, тема проекта и срок сдачи обязательны.', ko: '과목, 프로젝트 주제 및 마감일은 필수입니다.', ja: '科目、課題テーマ、締切日は必須です。', ar: 'المقرر وموضوع المشروع وتاريخ التسليم مطلوبة.' },
    toast_course_required: { en: 'Course name, instructor name and credit are required.', tr: 'Ders adı, eğitmen adı ve kredi zorunludur.', de: 'Kursname, Dozentenname und Credits erforderlich.', es: 'Nombre del curso, instructor y créditos obligatorios.', fr: 'Nom du cours, enseignant et crédits obligatoires.', it: 'Nome corso, docente e crediti obbligatori.', ru: 'Название курса, преподаватель и кредиты обязательны.', ko: '과목명, 교수명 및 학점은 필수입니다.', ja: '科目名、担当教員、単位数は必須です。', ar: 'اسم المقرر واسم المدرس والساعات مطلوبة.' },
    toast_course_saved_success: { en: 'Course added successfully!', tr: 'Ders başarıyla eklendi!', de: 'Kurs erfolgreich hinzugefügt!', es: '¡Curso añadido con éxito!', fr: 'Cours ajouté avec succès !', it: 'Corso aggiunto con successo!', ru: 'Курс успешно добавлен!', ko: '과목이 성공적으로 추가되었습니다!', ja: '科目を正常に追加しました！', ar: 'تمت إضافة المقرر بنجاح!' },
    toast_course_deleted_success: { en: '"{name}" deleted.', tr: '"{name}" silindi.', de: '"{name}" gelöscht.', es: '"{name}" eliminado.', fr: '"{name}" supprimé.', it: '"{name}" eliminato.', ru: '"{name}" удалено.', ko: '"{name}"이(가) 삭제되었습니다.', ja: '「{name}」を削除しました。', ar: 'تم حذف "{name}".' },
    toast_exam_saved_success: { en: 'Exam saved successfully!', tr: 'Sınav başarıyla kaydedildi!', de: 'Prüfung erfolgreich gespeichert!', es: '¡Examen guardado con éxito!', fr: 'Examen enregistré avec succès !', it: 'Esame salvato con successo!', ru: 'Экзамен успешно сохранен!', ko: '시험이 성공적으로 저장되었습니다!', ja: '試験を正常に保存しました！', ar: 'تم حفظ الاختبار بنجاح!' },
    toast_exam_deleted_success: { en: 'Exam deleted.', tr: 'Sınav silindi.', de: 'Prüfung gelöscht.', es: 'Examen eliminado.', fr: 'Examen supprimé.', it: 'Esame eliminato.', ru: 'Экзамен удален.', ko: '시험이 삭제되었습니다.', ja: '試験を削除しました。', ar: 'تم حذف الاختبار.' },
    toast_project_saved_success: { en: 'Project saved successfully!', tr: 'Proje başarıyla kaydedildi!', de: 'Projekt erfolgreich gespeichert!', es: '¡Proyecto guardado con éxito!', fr: 'Projet enregistré avec succès !', it: 'Progetto salvato con successo!', ru: 'Проект успешно сохранен!', ko: '프로젝트가 성공적으로 저장되었습니다!', ja: 'プロジェクトを正常に保存しました！', ar: 'تم حفظ المشروع بنجاح!' },
    toast_project_deleted_success: { en: 'Project deleted.', tr: 'Proje silindi.', de: 'Projekt gelöscht.', es: 'Proyecto eliminado.', fr: 'Projet supprimé.', it: 'Progetto eliminato.', ru: 'Проект удален.', ko: '프로젝트가 삭제되었습니다.', ja: 'プロジェクトを削除しました。', ar: 'تم حذف المشروع.' },
    toast_activity_saved_success: { en: 'Activity saved successfully!', tr: 'Etkinlik başarıyla kaydedildi!', de: 'Aktivität erfolgreich gespeichert!', es: '¡Actividad guardada con éxito!', fr: 'Activité enregistrée avec succès !', it: 'Attività salvata con successo!', ru: 'Активность успешно сохранена!', ko: '활동이 성공적으로 저장되었습니다!', ja: 'アクティビティを正常に保存しました！', ar: 'تم حفظ النشاط بنجاح!' },
    toast_activity_deleted_success: { en: 'Activity deleted.', tr: 'Etkinlik silindi.', de: 'Aktivität gelöscht.', es: 'Actividad eliminada.', fr: 'Activité supprimée.', it: 'Attività eliminata.', ru: 'Активность удалена.', ko: '활동이 삭제되었습니다.', ja: 'アクティビティを削除しました。', ar: 'تم حذف النشاط.' },
    toast_note_added_success: { en: 'Note added.', tr: 'Not eklendi.', de: 'Notiz hinzugefügt.', es: 'Nota añadida.', fr: 'Note ajoutée.', it: 'Nota aggiunta.', ru: 'Заметка добавлена.', ko: '메모가 추가되었습니다.', ja: 'メモを追加しました。', ar: 'تمت إضافة الملاحظة.' },
    toast_note_empty_warning: { en: 'Please write a note first.', tr: 'Lütfen önce bir not yazın.', de: 'Bitte schreibe zuerst eine Notiz.', es: 'Por favor, escribe una nota primero.', fr: 'Veuillez d\'abord rédiger une note.', it: 'Scrivi prima una nota.', ru: 'Пожалуйста, сначала напишите заметку.', ko: '먼저 메모를 작성해주세요.', ja: '最初にメモを入力してください。', ar: 'يرجى كتابة ملاحظة أولاً.' },
    toast_pfp_updated: { en: 'Profile picture adjusted and updated!', tr: 'Profil fotoğrafı ayarlandı ve güncellendi!', de: 'Profilbild angepasst und aktualisiert!', es: '¡Foto de perfil actualizada!', fr: 'Photo de profil mise à jour !', it: 'Immagine del profilo aggiornata!', ru: 'Фото профиля обновлено!', ko: '프로필 사진이 업데이트되었습니다!', ja: 'プロフィール写真を更新しました！', ar: 'تم تحديث صورة الملف الشخصي!' },
    toast_invalid_image: { en: 'Please select a valid image file (JPEG, PNG, WEBP).', tr: 'Lütfen geçerli bir görsel dosyası seçin (JPEG, PNG, WEBP).', de: 'Bitte wähle eine gültige Bilddatei (JPEG, PNG, WEBP).', es: 'Por favor, selecciona un archivo de imagen válido (JPEG, PNG, WEBP).', fr: 'Veuillez sélectionner une image valide (JPEG, PNG, WEBP).', it: 'Seleziona un file immagine valido (JPEG, PNG, WEBP).', ru: 'Пожалуйста, выберите изображение (JPEG, PNG, WEBP).', ko: '올바른 이미지 파일(JPEG, PNG, WEBP)을 선택해주세요.', ja: '有効な画像ファイル(JPEG, PNG, WEBP)を選択してください。', ar: 'يرجى تحديد ملف صورة صالح (JPEG, PNG, WEBP).' },
    toast_avatar_updated: { en: 'Avatar icon updated!', tr: 'Avatar ikonu güncellendi!', de: 'Avatar-Icon aktualisiert!', es: '¡Icono de avatar actualizado!', fr: 'Icône d\'avatar mise à jour !', it: 'Icona avatar aggiornata!', ru: 'Аватар обновлен!', ko: '아바타 아이콘이 변경되었습니다!', ja: 'アバターアイコンを更新しました！', ar: 'تم تحديث الصورة الرمزية!' },
    toast_name_empty: { en: 'Full Name cannot be empty.', tr: 'Ad Soyad alanı boş bırakılamaz.', de: 'Vollständiger Name darf nicht leer sein.', es: 'El nombre completo no puede estar vacío.', fr: 'Le nom complet ne peut pas être vide.', it: 'Il nome completo non può essere vuoto.', ru: 'Полное имя не может быть пустым.', ko: '이름을 입력해주세요.', ja: '氏名を入力してください。', ar: 'لا يمكن ترك الاسم الكامل فارغاً.' },
    toast_email_empty: { en: 'Email address cannot be empty.', tr: 'E-posta adresi boş bırakılamaz.', de: 'E-Mail-Adresse darf nicht leer sein.', es: 'El correo electrónico no puede estar vacío.', fr: 'L\'adresse e-mail ne peut pas être vide.', it: 'L\'indirizzo email non può essere vuoto.', ru: 'Электронная почта не может быть пустой.', ko: '이메일 주소를 입력해주세요.', ja: 'メールアドレスを入力してください。', ar: 'لا يمكن ترك البريد الإلكتروني فارغاً.' },
    toast_grade_empty: { en: 'Please select your class / year.', tr: 'Lütfen sınıf / yıl bilginizi seçin.', de: 'Bitte wähle deine Klasse / Studienjahr.', es: 'Por favor, selecciona tu curso / año.', fr: 'Veuillez sélectionner votre classe / année.', it: 'Seleziona la tua classe / anno.', ru: 'Пожалуйста, выберите курс / класс.', ko: '학년 / 학기를 선택해주세요.', ja: '学年を選択してください。', ar: 'يرجى تحديد الصف / السنة الدراسية.' },
    toast_pass_min_length: { en: 'New password must be at least 6 characters long.', tr: 'Yeni şifre en az 6 karakter olmalıdır.', de: 'Neues Passwort muss mindestens 6 Zeichen lang sein.', es: 'La nueva contraseña debe tener al menos 6 caracteres.', fr: 'Le nouveau mot de passe doit comporter au moins 6 caractères.', it: 'La nuova password deve contenere almeno 6 caratteri.', ru: 'Новый пароль должен содержать не менее 6 символов.', ko: '새 비밀번호는 최소 6자 이상이어야 합니다.', ja: '新しいパスワードは6文字以上である必要があります。', ar: 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.' },
    toast_curr_pass_required: { en: 'Please enter your current password to set a new password.', tr: 'Yeni şifre belirlemek için lütfen mevcut şifrenizi girin.', de: 'Bitte gib dein aktuelles Passwort ein, um ein neues festzulegen.', es: 'Por favor, introduce tu contraseña actual para establecer una nueva.', fr: 'Veuillez saisir votre mot de passe actuel.', it: 'Inserisci la password attuale per impostarne una nuova.', ru: 'Пожалуйста, введите текущий пароль для установки нового.', ko: '새 비밀번호를 설정하려면 현재 비밀번호를 입력해주세요.', ja: '新しいパスワードを設定するには現在のパスワードを入力してください。', ar: 'يرجى إدخال كلمة المرور الحالية لتعيين كلمة مرور جديدة.' },
    auth_password_same_as_old: { en: 'Your new password cannot be the same as your old password.', tr: 'Yeni şifreniz eski şifrenizle aynı olamaz. Lütfen farklı bir şifre belirleyin.', de: 'Dein neues Passwort darf nicht mit dem alten übereinstimmen.', es: 'Tu nueva contraseña no puede ser igual a la anterior.', fr: 'Votre nouveau mot de passe ne peut pas être identique à l\'ancien.', it: 'La tua nuova password non può essere uguale a quella precedente.', ru: 'Новый пароль не может совпадать со старым.', ko: '새 비밀번호는 이전 비밀번호와 같을 수 없습니다.', ja: '新しいパスワードは古いパスワードと同じにすることはできません。', ar: 'لا يمكن أن تكون كلمة المرور الجديدة مطابقة لكلمة المرور القديمة.' },
    toast_account_deleted: { en: 'Your account has been deleted.', tr: 'Hesabınız başarıyla silindi.', de: 'Dein Konto wurde gelöscht.', es: 'Tu cuenta ha sido eliminada.', fr: 'Votre compte a été supprimé.', it: 'Il tuo account è stato eliminato.', ru: 'Ваш аккаунт был удален.', ko: '계정이 삭제되었습니다.', ja: 'アカウントが削除されました。', ar: 'تم حذف حسابك.' },

    confirm_remove_buddy_title: { en: 'Remove Buddy', tr: 'Arkadaşı Çıkar', de: 'Lernpartner entfernen', es: 'Eliminar Compañero', fr: 'Supprimer l\'ami', it: 'Rimuovi Compagno', ru: 'Удалить друга', ko: '친구 삭제', ja: '友達を削除', ar: 'إزالة الصديق' },
    confirm_remove_buddy_msg: { en: 'Are you sure you want to remove this buddy?', tr: 'Bu arkadaşı listenizden çıkarmak istediğinizden emin misiniz?', de: 'Möchtest du diesen Partner wirklich entfernen?', es: '¿Estás seguro de que deseas eliminar a este compañero?', fr: 'Êtes-vous sûr de vouloir supprimer cet ami ?', it: 'Sei sicuro di voler rimuovere questo compagno?', ru: 'Вы уверены, что хотите удалить этого друга?', ko: '이 친구를 삭제하시겠습니까?', ja: 'この友達を削除してもよろしいですか？', ar: 'هل أنت متأكد من رغبتك في إزالة هذا الصديق؟' },
    toast_buddy_removed: { en: 'Buddy removed.', tr: 'Arkadaş çıkarıldı.', de: 'Lernpartner entfernt.', es: 'Compañero eliminado.', fr: 'Ami supprimé.', it: 'Compagno rimosso.', ru: 'Друг удален.', ko: '친구가 삭제되었습니다.', ja: '友達を削除しました。', ar: 'تمت إزالة الصديق.' },
    toast_buddy_remove_err: { en: 'Could not remove buddy.', tr: 'Arkadaş çıkarılamadı.', de: 'Lernpartner konnte nicht entfernt werden.', es: 'No se pudo eliminar al compañero.', fr: 'Impossible de supprimer l\'ami.', it: 'Impossibile rimuovere il compagno.', ru: 'Не удалось удалить друга.', ko: '친구를 삭제할 수 없습니다.', ja: '友達を削除できませんでした。', ar: 'تعذر إزالة الصديق.' },
    confirm_del_grp_proj_title: { en: 'Delete Project', tr: 'Projeyi Sil', de: 'Projekt löschen', es: 'Eliminar Proyecto', fr: 'Supprimer le projet', it: 'Elimina Progetto', ru: 'Удалить проект', ko: '프로젝트 삭제', ja: 'プロジェクトを削除', ar: 'حذف المشروع' },
    confirm_del_grp_proj_msg: { en: 'Are you sure you want to delete this group project?', tr: 'Bu grup projesini silmek istediğinizden emin misiniz?', de: 'Möchtest du dieses Gruppenprojekt wirklich löschen?', es: '¿Estás seguro de que deseas eliminar este proyecto grupal?', fr: 'Êtes-vous sûr de vouloir supprimer ce projet de groupe ?', it: 'Sei sicuro di voler eliminare questo progetto di gruppo?', ru: 'Вы уверены, что хотите удалить этот групповой проект?', ko: '이 그룹 프로젝트를 삭제하시겠습니까?', ja: 'このグループ課題を削除してもよろしいですか？', ar: 'هل أنت متأكد من حذف هذا المشروع الجماعي؟' },
    toast_grp_proj_deleted: { en: 'Group project deleted.', tr: 'Grup projesi silindi.', de: 'Gruppenprojekt gelöscht.', es: 'Proyecto grupal eliminado.', fr: 'Projet de groupe supprimé.', it: 'Progetto di gruppo eliminato.', ru: 'Групповой проект удален.', ko: '그룹 프로젝트가 삭제되었습니다.', ja: 'グループ課題を削除しました。', ar: 'تم حذف المشروع الجماعي.' },
    toast_grp_proj_delete_err: { en: 'Could not delete project.', tr: 'Proje silinemedi.', de: 'Projekt konnte nicht gelöscht werden.', es: 'No se pudo eliminar el proyecto.', fr: 'Impossible de supprimer le projet.', it: 'Impossibile eliminare il proyecto.', ru: 'Не удалось удалить проект.', ko: '프로젝트를 삭제할 수 없습니다.', ja: 'プロジェクトを削除できませんでした。', ar: 'تعذر حذف المشروع.' },

    // Themes
    settings_theme_title: { en: 'Seasonal Theme & Atmosphere', tr: 'Mevsim Teması ve Görsel Atmosfer', de: 'Jahreszeiten-Theme & Atmosphäre', es: 'Tema Estacional y Atmósfera', fr: 'Thème Saisonnier et Ambiance', it: 'Tema Stagionale e Atmosfera', ru: 'Сезонная тема и атмосфера', ko: '계절 테마 및 분위기', ja: '季節のテーマと雰囲気', ar: 'السمة الموسمية والأجواء' },
    settings_theme_desc: { en: 'Customize the overall site color palette and dashboard video according to seasons.', tr: 'Sitenin genel renk paletini ve ana ekran videosunu mevsimlere göre özelleştirin.', de: 'Passe die Farbpalette und das Dashboard-Video an die Jahreszeit an.', es: 'Personaliza la paleta de colores y el video del panel según las estaciones.', fr: 'Personnalisez la palette de couleurs et la vidéo du tableau de bord selon les saisons.', it: 'Personalizza la palette dei colori e il video della dashboard in base alle stagioni.', ru: 'Настройте цветовую палитру и видео на панели в соответствии с сезоном.', ko: '계절에 맞게 사이트 색상 팔레트와 대시보드 비디오를 맞춤 설정하세요.', ja: '季節に合わせてサイトの配色とダッシュボードの動画をカスタマイズします。', ar: 'تخصيص لوحة ألوان الموقع وفيديو لوحة التحكم وفقاً للمواسم.' },
    theme_default: { en: 'Default', tr: 'Varsayılan', de: 'Standard', es: 'Predeterminado', fr: 'Par défaut', it: 'Predefinito', ru: 'По умолчанию', ko: '기본 테마', ja: 'デフォルト', ar: 'افتراضي' },
    theme_spring: { en: 'Spring', tr: 'İlkbahar', de: 'Frühling', es: 'Primavera', fr: 'Printemps', it: 'Primavera', ru: 'Весна', ko: '봄', ja: '春', ar: 'الربيع' },
    theme_summer: { en: 'Summer', tr: 'Yaz', de: 'Sommer', es: 'Verano', fr: 'Été', it: 'Estate', ru: 'Лето', ko: '여름', ja: '夏', ar: 'الصيف' },
    theme_autumn: { en: 'Autumn', tr: 'Sonbahar', de: 'Herbst', es: 'Otoño', fr: 'Automne', it: 'Autunno', ru: 'Осень', ko: '가을', ja: '秋', ar: 'الخريف' },
    theme_winter: { en: 'Winter', tr: 'Kış', de: 'Winter', es: 'Invierno', fr: 'Hiver', it: 'Inverno', ru: 'Зима', ko: '겨울', ja: '冬', ar: 'الشتاء' }
};

const LANGUAGES = ['en', 'tr', 'de', 'es', 'fr', 'it', 'ru', 'ko', 'ja', 'ar'];

const fullDictionary = {};
for (const lang of LANGUAGES) {
    fullDictionary[lang] = {};
}

for (const [key, translations] of Object.entries(RAW_DICTIONARY)) {
    const fallbackEn = translations['en'] || key;
    for (const lang of LANGUAGES) {
        fullDictionary[lang][key] = translations[lang] || fallbackEn;
    }
}

const fileHeader = `/* ==============================================================================
   ACADEMI BUDDY - MULTI-LANGUAGE (i18n) LOCALIZATION ENGINE
   Supported Languages (10):
   English (en), Türkçe (tr), Deutsch (de), Español (es), Français (fr),
   Italiano (it), Русский (ru), 한국어 (ko), 日本語 (ja), العربية (ar)
   ============================================================================== */

const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
];

const TRANSLATIONS = ${JSON.stringify(fullDictionary, null, 4)};

function getCurrentLanguage() {
    const saved = localStorage.getItem('ats_lang');
    if (saved && TRANSLATIONS[saved]) {
        return saved;
    }
    return 'en';
}
window.getCurrentLanguage = getCurrentLanguage;

function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
}
window.getSupportedLanguages = getSupportedLanguages;

function t(key, fallbackOrParams = null, optionalParams = null) {
    const lang = getCurrentLanguage();
    let text = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) ||
               (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]);

    let params = null;
    if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
        params = fallbackOrParams;
    } else if (typeof fallbackOrParams === 'string') {
        if (!text) text = fallbackOrParams;
        if (typeof optionalParams === 'object' && optionalParams !== null) {
            params = optionalParams;
        }
    }

    if (!text) text = key;

    if (params && typeof params === 'object') {
        Object.keys(params).forEach(p => {
            text = text.replace(new RegExp(\`\\\\{\${p}\\\\}\`, 'g'), params[p]);
        });
    }

    return text;
}
window.t = t;

function formatLocalizedGradeLevel(gradeLevel) {
    if (!gradeLevel) return typeof t === 'function' ? t('grade_student', 'Student') : 'Student';
    const str = String(gradeLevel).trim();
    if (str.toLowerCase().includes('1st') || str.includes('1. Sınıf') || str.toLowerCase().includes('freshman')) {
        return typeof t === 'function' ? t('grade_1st', '1st Grade') : '1st Grade';
    }
    if (str.toLowerCase().includes('2nd') || str.includes('2. Sınıf') || str.toLowerCase().includes('sophomore')) {
        return typeof t === 'function' ? t('grade_2nd', '2nd Grade') : '2nd Grade';
    }
    if (str.toLowerCase().includes('3rd') || str.includes('3. Sınıf') || str.toLowerCase().includes('junior')) {
        return typeof t === 'function' ? t('grade_3rd', '3rd Grade') : '3rd Grade';
    }
    if (str.toLowerCase().includes('4th') || str.includes('4. Sınıf') || str.toLowerCase().includes('senior')) {
        return typeof t === 'function' ? t('grade_4th', '4th Grade') : '4th Grade';
    }
    if (str.toLowerCase().includes('prep') || str.toLowerCase().includes('hazırlık')) {
        return typeof t === 'function' ? t('grade_prep', 'Prep Year') : 'Prep Year';
    }
    if (str.toLowerCase().includes('master') || str.toLowerCase().includes('graduate') || str.toLowerCase().includes('yüksek')) {
        return typeof t === 'function' ? t('grade_masters', 'Master\\'s / Graduate') : 'Master\\'s / Graduate';
    }
    if (str.toLowerCase().includes('phd') || str.toLowerCase().includes('doktora')) {
        return typeof t === 'function' ? t('grade_phd', 'PhD') : 'PhD';
    }
    if (str.toLowerCase() === 'other' || str.toLowerCase() === 'diğer') {
        return typeof t === 'function' ? t('grade_other', 'Other') : 'Other';
    }
    return str;
}
window.formatLocalizedGradeLevel = formatLocalizedGradeLevel;

function formatLocalizedDepartment(dept) {
    if (!dept) return '';
    const str = String(dept).trim();
    if (str.toLowerCase() === 'computer engineering' || str.toLowerCase() === 'bilgisayar mühendisliği') {
        return typeof t === 'function' ? t('dept_computer_engineering', str) : str;
    }
    return str;
}
window.formatLocalizedDepartment = formatLocalizedDepartment;

function updateNavTranslations() {
    const dashBtn = document.getElementById('dashboardBtn');
    const coursesBtn = document.getElementById('coursesBtn');
    const examsBtn = document.getElementById('examsBtn');
    const studyBtn = document.getElementById('studyBtn');
    const groupProjectsBtn = document.getElementById('groupProjectsSidebarBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (dashBtn) dashBtn.textContent = t('nav_dashboard');
    if (coursesBtn) coursesBtn.textContent = t('nav_grades');
    if (examsBtn) examsBtn.textContent = t('nav_deadlines');
    if (studyBtn) studyBtn.textContent = t('nav_study_sessions');
    if (groupProjectsBtn) groupProjectsBtn.textContent = t('nav_group_projects');

    if (settingsBtn) {
        settingsBtn.innerHTML = \`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:8px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>\${typeof escapeHtml === 'function' ? escapeHtml(t('nav_settings')) : t('nav_settings')}\`;
    }

    if (logoutBtn) {
        logoutBtn.innerHTML = \`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:8px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>\${typeof escapeHtml === 'function' ? escapeHtml(t('nav_logout')) : t('nav_logout')}\`;
    }
}
window.updateNavTranslations = updateNavTranslations;

function setLanguage(langCode, notify = false) {
    if (!TRANSLATIONS[langCode]) {
        console.warn('Unsupported language code:', langCode);
        return;
    }

    localStorage.setItem('ats_lang', langCode);
    document.documentElement.lang = langCode;

    if (notify && typeof syncUserPreferenceToCloud === 'function') {
        syncUserPreferenceToCloud({ language: langCode });
    }

    updateNavTranslations();

    // Re-render user sidebar if user info is present
    if (typeof getStoredUser === 'function') {
        const currentUser = getStoredUser();
        if (currentUser && typeof renderSidebarUser === 'function') {
            renderSidebarUser(currentUser);
        }
    }

    // Re-render current page if active using exact page state
    const currentPage = window._currentActivePage || 'dashboard';

    if (currentPage === 'settings') {
        if (typeof loadSettingsPage === 'function') loadSettingsPage();
    } else if (currentPage === 'courses' || currentPage === 'grades') {
        if (typeof loadCourses === 'function') loadCourses();
    } else if (currentPage === 'exams' || currentPage === 'deadlines') {
        if (typeof loadExamsPage === 'function') loadExamsPage();
    } else if (currentPage === 'study') {
        if (typeof loadStudyPage === 'function') loadStudyPage();
    } else {
        if (typeof loadDashboard === 'function') loadDashboard();
    }

    // Refresh AI Bubble texts if exists
    if (typeof reinitAiChatTexts === 'function') {
        reinitAiChatTexts();
    }

    if (typeof updateForgotPasswordModalTranslations === 'function') {
        updateForgotPasswordModalTranslations();
    }

    if (notify && typeof showToast === 'function') {
        showToast(t('toast_lang_changed'), 'success');
    }
}
window.setLanguage = setLanguage;

document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.lang = getCurrentLanguage();
    updateNavTranslations();
});
`;

fs.writeFileSync(path.join(__dirname, 'frontend', 'js', 'i18n.js'), fileHeader, 'utf8');
console.log('Successfully built i18n.js! Total keys per language:', Object.keys(RAW_DICTIONARY).length);
