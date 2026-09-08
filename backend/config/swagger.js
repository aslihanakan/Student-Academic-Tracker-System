const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");
const fs = require("fs");

const routesPath = path.resolve(__dirname, "../routes");

// Route dosyalarını wildcard yerine doğrudan tek tek veriyoruz.
// Böylece Windows/Linux ortamlarında glob/path çözümleme problemi yaşanmaz.
const routeFiles = fs
    .readdirSync(routesPath)
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(routesPath, file));

const apiFiles = [...routeFiles, path.resolve(__dirname, "../app.js")];

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Academi Buddy - Student Academic Tracker API",
            version: "1.2.0",
            description:
                "Öğrencilerin derslerini, sınavlarını, projelerini, çalışma seanslarını, yapılacaklar listesini, günlük notlarını, grup projelerini, çalışma arkadaşlarını (Buddies) ve Yapay Zeka koçunu takip etmesini sağlayan kapsamlı REST API dokümantasyonu."
        },
        servers: [
            {
                url: "http://localhost:5000",
                description: "Local development server"
            }
        ],
        security: [
            { bearerAuth: [] }
        ],
        tags: [
            { name: "Auth", description: "Kayıt olma, giriş yapma, profil ve oturum işlemleri" },
            { name: "Courses", description: "Ders yönetimi ve notlandırma ile ilgili işlemler" },
            { name: "Exams", description: "Sınav kayıtları ve durum takibi" },
            { name: "Projects", description: "Bireysel proje kayıtları ile ilgili işlemler" },
            { name: "Study Sessions", description: "Çalışma seansları ve saat hesaplama işlemleri" },
            { name: "Todos", description: "Yapılacaklar listesi ve son teslim tarihleri" },
            { name: "Dashboard", description: "Genel istatistik ve özet bilgileri" },
            { name: "Day Notes", description: "Günlük notlar ve takvim ajandası işlemleri" },
            { name: "AI Assistant", description: "Yapay zeka akademik koçu, sohbet ve müfredat (syllabus) analizi" },
            { name: "Study Buddies", description: "Çalışma arkadaşı ekleme, davetler ve çalışma serisi (streak)" },
            { name: "Group Projects", description: "Grup projeleri, üye yönetimi ve ortak görev takibi" },
            { name: "System", description: "Sistem durumu ve servis sağlık kontrolleri" }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "/api/auth/login veya /api/auth/register ile alınan token'ı buraya 'Bearer <token>' formatında girin."
                }
            },
            schemas: {
                RegisterInput: {
                    type: "object",
                    required: ["name", "email", "password"],
                    properties: {
                        name: { type: "string", example: "Ayşe Yılmaz" },
                        email: { type: "string", format: "email", example: "ayse@example.com" },
                        password: { type: "string", format: "password", minLength: 6, example: "sifre123" },
                        gradeLevel: { type: "string", example: "4. Sınıf" },
                        department: { type: "string", example: "Bilgisayar Mühendisliği" },
                        avatar: { type: "string", example: "1.jpg" },
                        theme: { type: "string", example: "default" },
                        language: { type: "string", example: "tr" }
                    }
                },

                UpdateProfileInput: {
                    type: "object",
                    properties: {
                        name: { type: "string", example: "Ayşe Yılmaz" },
                        email: { type: "string", format: "email", example: "ayse@example.com" },
                        gradeLevel: { type: "string", example: "4. Sınıf" },
                        department: { type: "string", example: "Bilgisayar Mühendisliği" },
                        avatar: { type: "string", example: "1.jpg" },
                        theme: { type: "string", example: "default" },
                        language: { type: "string", example: "tr" },
                        currentPassword: { type: "string", format: "password", example: "eskiSifre123" },
                        newPassword: { type: "string", format: "password", minLength: 6, example: "yeniSifre123" }
                    }
                },

                LoginInput: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email", example: "ayse@example.com" },
                        password: { type: "string", format: "password", example: "sifre123" }
                    }
                },

                AuthResponse: {
                    type: "object",
                    properties: {
                        token: {
                            type: "string",
                            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        },
                        user: {
                            type: "object",
                            properties: {
                                id: { type: "integer", example: 1 },
                                name: { type: "string", example: "Ayşe Yılmaz" },
                                email: { type: "string", example: "ayse@example.com" },
                                gradeLevel: { type: "string", example: "4. Sınıf" },
                                department: { type: "string", example: "Bilgisayar Mühendisliği" },
                                avatar: { type: "string", example: "1.jpg" },
                                theme: { type: "string", example: "default" },
                                language: { type: "string", example: "tr" }
                            }
                        }
                    }
                },

                Assessment: {
                    type: "object",
                    required: ["name", "grade", "weight"],
                    properties: {
                        id: { type: "integer", example: 1 },
                        name: { type: "string", example: "Ödev 1" },
                        grade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            example: 85
                        },
                        weight: {
                            type: "number",
                            minimum: 0.01,
                            maximum: 100,
                            example: 10
                        }
                    }
                },

                Course: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        courseName: { type: "string", example: "Web Programlama" },
                        instructorName: { type: "string", example: "Dr. Ayşe Yılmaz" },
                        credit: {
                            type: "integer",
                            minimum: 1,
                            maximum: 10,
                            example: 4
                        },

                        midtermGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 78
                        },

                        projectGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 85
                        },

                        finalGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 90
                        },

                        midtermWeight: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            example: 40
                        },

                        projectWeight: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            example: 10
                        },

                        passingGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            example: 60
                        },

                        makeupGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 65
                        },

                        academicYear: {
                            type: "string",
                            nullable: true,
                            example: "2026-2027 Fall"
                        },

                        semester: {
                            type: "string",
                            nullable: true,
                            example: "Unspecified"
                        },

                        assessments: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/Assessment"
                            },
                            example: [
                                {
                                    name: "Ödev 1",
                                    grade: 85,
                                    weight: 10
                                },
                                {
                                    name: "Yoklama",
                                    grade: 95,
                                    weight: 5
                                }
                            ]
                        }
                    }
                },

                CourseInput: {
                    type: "object",
                    required: ["courseName", "instructorName", "credit"],
                    properties: {
                        courseName: {
                            type: "string",
                            example: "Web Programlama"
                        },

                        instructorName: {
                            type: "string",
                            example: "Dr. Ayşe Yılmaz"
                        },

                        credit: {
                            type: "integer",
                            minimum: 1,
                            maximum: 10,
                            example: 4
                        },

                        midtermGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 78
                        },

                        projectGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 85
                        },

                        finalGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 90
                        },

                        midtermWeight: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            example: 40
                        },

                        projectWeight: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            example: 10
                        },

                        passingGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            default: 60,
                            example: 60
                        },

                        makeupGrade: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 65
                        },

                        academicYear: {
                            type: "string",
                            nullable: true,
                            example: "2026-2027 Fall"
                        },

                        semester: {
                            type: "string",
                            nullable: true,
                            example: "Unspecified"
                        },

                        assessments: {
                            type: "array",
                            description:
                                "Ödev, yoklama, quiz veya öğretmenin kullandığı diğer not türleri.",
                            items: {
                                $ref: "#/components/schemas/Assessment"
                            },
                            example: [
                                {
                                    name: "Ödev 1",
                                    grade: 85,
                                    weight: 10
                                },
                                {
                                    name: "Yoklama",
                                    grade: 95,
                                    weight: 5
                                }
                            ]
                        }
                    }
                },

                Exam: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },

                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        examName: {
                            type: "string",
                            example: "Vize Sınavı"
                        },

                        examDate: {
                            type: "string",
                            format: "date",
                            example: "2026-04-15"
                        },

                        examType: {
                            type: "string",
                            enum: [
                                "midterm",
                                "final",
                                "quiz",
                                "other"
                            ],
                            example: "midterm"
                        },

                        score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 82
                        },

                        isDone: {
                            type: "integer",
                            enum: [0, 1],
                            example: 0,
                            description:
                                "Sınav tamamlandıysa 1, tamamlanmadıysa 0."
                        }
                    }
                },

                ExamInput: {
                    type: "object",
                    required: [
                        "courseId",
                        "examName",
                        "examDate",
                        "examType"
                    ],
                    properties: {
                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        examName: {
                            type: "string",
                            example: "Vize Sınavı"
                        },

                        examDate: {
                            type: "string",
                            format: "date",
                            example: "2026-04-15"
                        },

                        examType: {
                            type: "string",
                            enum: [
                                "midterm",
                                "final",
                                "quiz",
                                "other"
                            ],
                            example: "midterm"
                        },

                        score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 82
                        }
                    }
                },

                Project: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },

                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        projectName: {
                            type: "string",
                            example: "Final Projesi"
                        },

                        dueDate: {
                            type: "string",
                            format: "date",
                            example: "2026-05-20"
                        },

                        description: {
                            type: "string",
                            nullable: true,
                            example:
                                "REST API tabanlı bir uygulama geliştirilecek."
                        },

                        score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 95
                        },

                        status: {
                            type: "string",
                            enum: [
                                "pending",
                                "in progress",
                                "completed"
                            ],
                            example: "pending"
                        }
                    }
                },

                ProjectInput: {
                    type: "object",
                    required: [
                        "courseId",
                        "projectName",
                        "dueDate"
                    ],
                    properties: {
                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        projectName: {
                            type: "string",
                            example: "Final Projesi"
                        },

                        dueDate: {
                            type: "string",
                            format: "date",
                            example: "2026-05-20"
                        },

                        description: {
                            type: "string",
                            nullable: true,
                            example:
                                "REST API tabanlı bir uygulama geliştirilecek."
                        },

                        score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                            nullable: true,
                            example: 95
                        },

                        status: {
                            type: "string",
                            enum: [
                                "pending",
                                "in progress",
                                "completed"
                            ],
                            default: "pending",
                            example: "pending"
                        }
                    }
                },

                StudySession: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },

                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        studyDate: {
                            type: "string",
                            format: "date",
                            example: "2026-03-10"
                        },

                        hours: {
                            type: "number",
                            format: "float",
                            minimum: 0,
                            exclusiveMinimum: true,
                            example: 2.5
                        },

                        note: {
                            type: "string",
                            nullable: true,
                            example: "Konu tekrarı yapıldı."
                        }
                    }
                },

                StudySessionInput: {
                    type: "object",
                    required: [
                        "courseId",
                        "studyDate",
                        "hours"
                    ],
                    properties: {
                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        studyDate: {
                            type: "string",
                            format: "date",
                            example: "2026-03-10"
                        },

                        hours: {
                            type: "number",
                            format: "float",
                            minimum: 0,
                            exclusiveMinimum: true,
                            example: 2.5
                        },

                        note: {
                            type: "string",
                            nullable: true,
                            example: "Konu tekrarı yapıldı."
                        }
                    }
                },

                TotalStudyHours: {
                    type: "object",
                    properties: {
                        totalHours: {
                            type: "number",
                            format: "float",
                            example: 24.5
                        }
                    }
                },

                Todo: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },

                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        type: {
                            type: "string",
                            enum: [
                                "exam",
                                "project",
                                "homework",
                                "quiz",
                                "other"
                            ],
                            example: "homework"
                        },

                        title: {
                            type: "string",
                            example: "Matematik ödevini tamamla"
                        },

                        dueDate: {
                            type: "string",
                            format: "date",
                            example: "2026-04-15"
                        },

                        isDone: {
                            type: "integer",
                            enum: [0, 1],
                            example: 0
                        }
                    }
                },

                TodoInput: {
                    type: "object",
                    required: [
                        "courseId",
                        "type",
                        "title",
                        "dueDate"
                    ],
                    properties: {
                        courseId: {
                            type: "integer",
                            example: 1
                        },

                        type: {
                            type: "string",
                            enum: [
                                "exam",
                                "project",
                                "homework",
                                "quiz",
                                "other"
                            ],
                            example: "homework"
                        },

                        title: {
                            type: "string",
                            example: "Matematik ödevini tamamla"
                        },

                        dueDate: {
                            type: "string",
                            format: "date",
                            example: "2026-04-15"
                        }
                    }
                },

                TodoStatusInput: {
                    type: "object",
                    required: ["isDone"],
                    properties: {
                        isDone: {
                            type: "integer",
                            enum: [0, 1],
                            example: 1
                        }
                    }
                },

                DashboardSummary: {
                    type: "object",
                    description: "Panelde gösterilecek genel özet bilgileri.",
                    properties: {
                        totalCourses: {
                            type: "integer",
                            example: 6
                        },

                        totalExams: {
                            type: "integer",
                            example: 12
                        },

                        totalProjects: {
                            type: "integer",
                            example: 4
                        },

                        totalStudyHours: {
                            type: "number",
                            example: 38.5
                        },

                        nearestTodo: {
                            $ref: "#/components/schemas/Todo"
                        }
                    }
                },

                PreferencesInput: {
                    type: "object",
                    properties: {
                        theme: { type: "string", example: "dark" },
                        language: { type: "string", example: "tr" }
                    }
                },

                PreferencesResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        theme: { type: "string", example: "dark" },
                        language: { type: "string", example: "tr" }
                    }
                },

                DayNote: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        userId: { type: "integer", example: 1 },
                        noteDate: { type: "string", format: "date", example: "2026-09-04" },
                        text: { type: "string", example: "Algoritmalar dersi için araştırma yapıldı." },
                        createdAt: { type: "string", example: "2026-09-04 10:00:00" },
                        updatedAt: { type: "string", example: "2026-09-04 10:00:00" }
                    }
                },

                DayNoteInput: {
                    type: "object",
                    required: ["noteDate", "text"],
                    properties: {
                        noteDate: { type: "string", format: "date", example: "2026-09-04" },
                        text: { type: "string", example: "Algoritmalar dersi için araştırma yapıldı." }
                    }
                },

                Buddy: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 2 },
                        name: { type: "string", example: "Burak Demir" },
                        email: { type: "string", example: "burak@example.com" },
                        avatar: { type: "string", example: "default" },
                        department: { type: "string", example: "Bilgisayar Mühendisliği" },
                        gradeLevel: { type: "string", example: "3" },
                        friendshipId: { type: "integer", example: 5 },
                        weeklyHours: { type: "number", example: 12.5 },
                        streak: { type: "integer", example: 4 }
                    }
                },

                BuddiesResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        myStreak: { type: "integer", example: 5 },
                        myWeeklyHours: { type: "number", example: 14.2 },
                        buddies: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Buddy" }
                        },
                        pendingIncoming: {
                            type: "array",
                            items: { type: "object" }
                        },
                        pendingOutgoing: {
                            type: "array",
                            items: { type: "object" }
                        }
                    }
                },

                BuddyInviteInput: {
                    type: "object",
                    required: ["emailOrName"],
                    properties: {
                        emailOrName: { type: "string", example: "burak@example.com" }
                    }
                },

                GroupProject: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        title: { type: "string", example: "Yapay Zeka Dönem Projesi" },
                        courseName: { type: "string", example: "CENG 401" },
                        ownerId: { type: "integer", example: 1 },
                        dueDate: { type: "string", format: "date", example: "2026-06-15" },
                        description: { type: "string", example: "Görüntü işleme tabanlı akademik takip projesi" },
                        createdAt: { type: "string", example: "2026-09-04 10:00:00" },
                        totalTasks: { type: "integer", example: 8 },
                        completedTasks: { type: "integer", example: 3 },
                        isOwner: { type: "boolean", example: true },
                        members: {
                            type: "array",
                            items: { type: "object" }
                        }
                    }
                },

                GroupProjectInput: {
                    type: "object",
                    required: ["title"],
                    properties: {
                        title: { type: "string", example: "Yapay Zeka Dönem Projesi" },
                        courseName: { type: "string", example: "CENG 401" },
                        dueDate: { type: "string", format: "date", example: "2026-06-15" },
                        description: { type: "string", example: "Görüntü işleme tabanlı akademik takip projesi" }
                    }
                },

                GroupMemberInput: {
                    type: "object",
                    required: ["emailOrName"],
                    properties: {
                        emailOrName: { type: "string", example: "ogrenci@universite.edu" }
                    }
                },

                GroupTask: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        projectId: { type: "integer", example: 1 },
                        title: { type: "string", example: "API Mimarisi Raporunu Hazırla" },
                        isDone: { type: "integer", example: 0 },
                        dueDate: { type: "string", format: "date", example: "2026-05-10" },
                        assignedUserId: { type: "integer", example: 2, nullable: true },
                        assignedUserName: { type: "string", example: "Burak Demir", nullable: true },
                        assignedUserAvatar: { type: "string", example: "default", nullable: true }
                    }
                },

                GroupTaskInput: {
                    type: "object",
                    required: ["title"],
                    properties: {
                        title: { type: "string", example: "API Mimarisi Raporunu Hazırla" },
                        dueDate: { type: "string", format: "date", example: "2026-05-10" },
                        assignedUserId: { type: "integer", example: 2 }
                    }
                },

                GroupTaskToggleInput: {
                    type: "object",
                    required: ["isDone"],
                    properties: {
                        isDone: { type: "boolean", example: true }
                    }
                },

                AiCoachRequest: {
                    type: "object",
                    properties: {
                        targetGpa: { type: "number", example: 3.5 }
                    }
                },

                AiCoachResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        data: { type: "object" }
                    }
                },

                AiChatRequest: {
                    type: "object",
                    required: ["question"],
                    properties: {
                        question: { type: "string", example: "Final haftasında hangi derse daha çok ağırlık vermeliyim?" },
                        targetGpa: { type: "number", example: 3.5 },
                        lang: { type: "string", example: "tr" },
                        history: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    role: { type: "string", example: "user" },
                                    content: { type: "string", example: "Merhaba" }
                                }
                            }
                        }
                    }
                },

                AiChatResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        answer: { type: "string", example: "Mevcut not durumunuza göre..." },
                        mode: { type: "string", example: "gemini" },
                        provider: { type: "string", example: "Gemini 2.0 Flash" }
                    }
                },

                AiParseSyllabusRequest: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string", example: "Course: Software Engineering\nCredit: 4\nMidterm: 30%..." }
                    }
                },

                AiParseSyllabusResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        data: { type: "object" }
                    }
                },

                AiImportSyllabusRequest: {
                    type: "object",
                    required: ["courseName"],
                    properties: {
                        courseName: { type: "string", example: "Software Engineering" },
                        instructorName: { type: "string", example: "Dr. Smith" },
                        credit: { type: "integer", example: 4 },
                        passingGrade: { type: "number", example: 60 },
                        midtermWeight: { type: "number", example: 30 },
                        projectWeight: { type: "number", example: 20 },
                        academicYear: { type: "string", example: "2026-2027 Fall" },
                        exams: { type: "array", items: { type: "object" } },
                        projects: { type: "array", items: { type: "object" } },
                        activities: { type: "array", items: { type: "object" } }
                    }
                },

                HealthResponse: {
                    type: "object",
                    properties: {
                        status: { type: "string", example: "ok" },
                        message: { type: "string", example: "Student Academic Tracker API is running" },
                        timestamp: { type: "string", format: "date-time" }
                    }
                },

                MessageResponse: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            example: "İşlem başarıyla tamamlandı."
                        }
                    }
                },

                Error: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            example: "Bir hata oluştu."
                        }
                    }
                }
            },

            responses: {
                NotFound: {
                    description: "Kayıt bulunamadı.",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            }
                        }
                    }
                },

                BadRequest: {
                    description: "Geçersiz istek verisi.",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            }
                        }
                    }
                },

                ServerError: {
                    description:
                        "Sunucu tarafında beklenmeyen bir hata oluştu.",
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Error"
                            }
                        }
                    }
                }
            }
        }
    },

    apis: apiFiles,
    failOnErrors: true
};

const swaggerSpec = swaggerJsdoc(options);

if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
    throw new Error(
        "Swagger endpointleri oluşturulamadı. routes klasöründeki @swagger açıklamalarını kontrol edin."
    );
}

console.log(
    `Swagger: ${Object.keys(swaggerSpec.paths).length} endpoint dokümante edildi.`
);

module.exports = swaggerSpec;