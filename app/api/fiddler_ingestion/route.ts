import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosInstance, AxiosResponse } from "axios";
const { FIDDLER_MODEL_ID, FIDDLER_TOKEN, FIDDLER_BASE_URL } = process.env;

enum EnvType {
    PRODUCTION = "PRODUCTION",
    PRE_PRODUCTION = "PRE_PRODUCTION",
}
const environment = EnvType.PRODUCTION;

function getAuthenticatedSession(): AxiosInstance {
    return axios.create({
        headers: { Authorization: `Bearer ${FIDDLER_TOKEN}` },
    });
}

async function publishOrUpdateEvents(
    source: object,
    environment: EnvType,
    datasetName?: string,
    update: boolean = false,
): Promise<any> {
    const session = getAuthenticatedSession();
    const method = update ? "patch" : "post";
    const url = `${FIDDLER_BASE_URL}/v3/events`;
    const data = {
        source: source,
        model_id: FIDDLER_MODEL_ID,
        env_type: environment,
        env_name: datasetName,
    };
    let response: AxiosResponse;
    try {
        response = await session.request({ method, url, data });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.statusText);
        } else {
            throw new Error(`An unexpected error occurred : ${error}`);
        }
    }

    return response.data;
}

export async function POST(req: NextRequest, res: NextResponse) {
    const fields = ["question", "answer", "documents", "url"];
    const data = await req.json();
    for (const field of fields) {
        if (!data[field]) {
            return NextResponse.json({ error: `${field} is missing in request body` }, { status: 400 });
        }
    }
    const { question, answer, context, url } = data || {};
    const source = {
        type: "EVENTS",
        events: [
            {
                question: question,
                answer: answer,
                documents: context,
                url: url,
                timestamp: Math.floor(Date.now() / 1000),
            },
        ],
    };
    try {
        const result = await publishOrUpdateEvents(source, environment, null, false);
        console.log("Event Ingested Successfully into Fiddler:", result);
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("An error occurred while ingesting event into the fiddler:", error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
