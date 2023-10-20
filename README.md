# Never
A NodeJS-based Network Video Recorder

_"I said I would never write this...but here we are"_

## Usage

Requirements:
* Redis
* Postgres

### Environment

Please set up your `.env` file like shown below

```dotenv
DATABASE_URL="postgresql://username:password@localhost:5432/never?schema=public"
REDIS_URL=redis://localhost:6379
```

### Commands

Commands are outlined appropriately inside of `package.json`;
