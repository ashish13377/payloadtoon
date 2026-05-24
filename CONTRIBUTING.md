# 🤝 Contributing to PayloadTOON

Thanks for your interest in contributing to PayloadTOON! 🚀

PayloadTOON is an open-source developer tool for JSON-to-TOON compression, token optimization, AI middleware, CLI workflows, and dashboard analytics.

## 🧩 Ways to Contribute

You can help with:

- 🐛 bug fixes
- ✨ feature requests
- 📚 documentation improvements
- 🎨 dashboard UI/UX improvements
- ✅ tests
- 🔌 AI provider integrations
- 🧮 tokenizer improvements
- 💻 CLI improvements
- 🧾 sample payloads and benchmarks

## 🛠️ Local Setup

```bash
git clone https://github.com/ashish13377/payloadtoon.git
cd payloadtoon
yarn install
cp .env.example .env
yarn dev
```

For Gemini-powered features, set:

```env
GEMINI_API_KEY=your_key_here
```

For saved templates with disk persistence:

```env
FILE_STORE_ENABLED=true
FILE_STORE_PATH=./data/saved_payloads.json
```

## Branch Strategy 🌿

PayloadTOON uses a simple contribution branch strategy.


| Branch      | Purpose                      |
| ----------- | ---------------------------- |
| `main`      | Production-ready stable code |
| `dev`       | Active development branch    |
| `feature/*` | New features                 |
| `fix/*`     | Bug fixes                    |
| `docs/*`    | Documentation changes        |

### Rules

- Do not push directly to `main`.
- Create feature branches from `dev`.
- Open pull requests into `dev`.
- Merge `dev` into `main` only for stable releases.
- Use clear branch names.

### Examples

````bash
git checkout dev
git pull origin dev
git checkout -b feature/saved-template-ui
````

## ✅ Before Submitting PR

Run:

```bash
yarn lint
yarn test
yarn build
````

## 🌱 Good First Contributions

- Improve examples in README
- Add more PowerShell commands
- Add more sample JSON payloads
- Improve dashboard empty states
- Add tests for saved payload APIs
- Add screenshots to docs
- Improve error messages

## 🧾 Pull Request Checklist

Before opening a PR:

- [ ]  Code builds successfully
- [ ]  Tests pass
- [ ]  No secrets are committed
- [ ]  Docs updated if behavior changed
- [ ]  Screenshots added for UI changes
- [ ]  PR title is clear

## 💬 Communication

Please keep discussions respectful, clear, and focused on improving the project.

Happy contributing! 🚀
