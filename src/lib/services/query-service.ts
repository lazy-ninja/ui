import type { Payloads } from '$lib/types';
import type { WorkflowQueryRouteParameters } from '$lib/types/api';
import type { Eventual, Settings } from '$lib/types/global';
import { convertPayloadToJsonWithCodec } from '$lib/utilities/decode-payload';
import { getQueryTypesFromError } from '$lib/utilities/get-query-types-from-error';
import { has } from '$lib/utilities/has';
import { stringifyWithBigInt } from '$lib/utilities/parse-with-big-int';
import { requestFromAPI } from '$lib/utilities/request-from-api';
import { routeForApi } from '$lib/utilities/route-for-api';

type QueryRequestParameters = {
  workflow: Eventual<{ id: string; runId: string }>;
  namespace: string;
  queryType: string;
  queryArgs?: Payloads;
};

type WorkflowParameters = Omit<
  QueryRequestParameters,
  'queryType' | 'queryArgs'
>;

type QueryPayload = {
  data: string;
  metadata: {
    encoding: string;
  };
};

type QueryType = {
  payloads: QueryPayload[];
};

type QueryResponse = {
  queryRejected: string | null;
  queryResult: QueryType;
} & Response;

export type ParsedQuery = ReturnType<typeof JSON.parse>[0];

const formatParameters = async (
  namespace: string,
  workflow: Eventual<{ id: string; runId: string }>,
  queryType: string,
): Promise<WorkflowQueryRouteParameters> => {
  workflow = await workflow;
  return {
    namespace,
    workflowId: workflow.id,
    queryType,
  };
};

async function fetchQuery(
  { workflow, namespace, queryType, queryArgs }: QueryRequestParameters,
  request = fetch,
  onError?: (error: {
    status: number;
    statusText: string;
    body: unknown;
  }) => void,
): Promise<QueryResponse> {
  workflow = await workflow;
  const parameters = await formatParameters(namespace, workflow, queryType);
  const route = routeForApi('query', parameters);

  return await requestFromAPI<QueryResponse>(route, {
    options: {
      method: 'POST',
      body: stringifyWithBigInt({
        execution: {
          workflowId: workflow.id,
          runId: workflow.runId,
        },
        query: {
          queryType,
          queryArgs,
        },
      }),
    },
    request,
    onError,
    notifyOnError: false,
  });
}

export async function getQueryTypes(
  options: WorkflowParameters,
  settings: Settings,
  accessToken: string,
): Promise<{ name: string; description?: string }[]> {
  try {
    const result = await getQuery(
      { ...options, queryType: '__temporal_workflow_metadata' },
      settings,
      accessToken,
    );
    return result?.definition?.queryDefinitions?.filter((query) => {
      return query?.name !== '__stack_trace';
    });
  } catch (e) {
    if (e.message?.includes('__temporal_workflow_metadata')) {
      return getQueryTypesFromError(e.message);
    } else {
      throw e;
    }
  }
}

export async function getQuery(
  options: QueryRequestParameters,
  settings: Settings,
  accessToken: string,
  request = fetch,
): Promise<ParsedQuery> {
  return fetchQuery(options, request).then(async (execution) => {
    const { queryResult } = execution ?? { queryResult: { payloads: [] } };

    let data: ParsedQuery = queryResult.payloads;
    try {
      if (data[0]) {
        const convertedAttributes = await convertPayloadToJsonWithCodec({
          attributes: queryResult,
          namespace: options.namespace,
          settings,
          accessToken,
        });

        if (
          has(convertedAttributes, 'payloads') &&
          Array.isArray(convertedAttributes.payloads)
        ) {
          data = convertedAttributes.payloads[0];
        }
      }
      return data;
    } catch (e) {
      if (typeof data !== 'string') {
        return stringifyWithBigInt(data);
      }

      return data;
    }
  });
}

export async function getWorkflowStackTrace(
  options: WorkflowParameters,
  settings: Settings,
  accessToken: string,
): Promise<ParsedQuery> {
  return getQuery(
    { ...options, queryType: '__stack_trace' },
    settings,
    accessToken,
  );
}
