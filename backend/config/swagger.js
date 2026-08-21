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

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Student Academic Tracker System API",
            version: "1.0.0",
            description:
                "Öğrencilerin derslerini, sınavlarını, projelerini, çalışma seanslarını ve yapılacaklar listesini takip etmesini sağlayan REST API dokümantasyonu."
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
            { name: "Auth", description: "Kayıt olma, giriş yapma ve oturum işlemleri" },
            { name: "Courses", description: "Ders yönetimi ile ilgili işlemler" },
            { name: "Exams", description: "Sınav kayıtları ile ilgili işlemler" },
            { name: "Projects", description: "Proje kayıtları ile ilgili işlemler" },
            { name: "Study Sessions", description: "Çalışma seansları ile ilgili işlemler" },
            { name: "Todos", description: "Yapılacaklar listesi ile ilgili işlemler" },
            { name: "Dashboard", description: "Genel özet bilgileri" }
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
                        avatar: { type: "string", example: "1.jpg" }
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
                                avatar: { type: "string", example: "1.jpg" }
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

    apis: routeFiles,
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