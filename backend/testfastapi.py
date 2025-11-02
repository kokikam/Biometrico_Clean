from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="FastAPI Test")


@app.get("/")
async def root():
    return {"status": "ok", "message": "FastAPI test endpoint is running"}


@app.get("/ping")
async def ping():
    return JSONResponse({"pong": True})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
