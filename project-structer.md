src/
├── config/database.ts       # Dual pools setup
├── db/schema.ts             # Drizzle schemas
├── lib/auth.ts              # Better-Auth config
├── routes/
│   ├── auth.ts              # Signup/Login/Logout/Me
│   ├── users.ts             # User CRUD
│   └── posts.ts             # Post CRUD
├── middleware/auth.ts       # Protected routes
└── index.ts                 # Main app