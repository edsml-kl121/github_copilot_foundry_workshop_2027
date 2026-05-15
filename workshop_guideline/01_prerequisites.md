### Pre-requisites

Please ensure you have installed node.js at https://nodejs.org/en/download

Then check if the following runs sucessfully
```
npm -v 
node -v
```

Next duplicate `.env.template` file and rename it to `.env`. Then please replace the following environmental variable `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `FOUNDRY_PROJECT_ENDPOINT` provided by the instructor.

Pre-requisites for spec-kit:

Please install uv: 
http://github.com/github/spec-kit/blob/main/docs/install/uv.md

Afterwards install the speckit CLI
```
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.10
```

Please check if speckit is successfully installed

```
specify --version
```

Please clone or download the repo. (See here for Git installation https://git-scm.com/book/en/v2/Getting-Started-Installing-Git):
```
git clone https://github.com/edsml-kl121/github_copilot_foundry_workshop_2027.git
```

```
cd github_copilot_foundry_workshop_2027
```
Then,
```
specify init . --integration copilot
```