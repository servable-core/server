export const METRICS_METER_NAME: "servable";
export type MetricAttributes = Record<string, string | number | boolean>;
export type CounterHandle = { name: string; add: (value?: number, attributes?: MetricAttributes) => void };
export type HistogramHandle = { name: string; record: (value: number, attributes?: MetricAttributes) => void };
export type GaugeHandle = { name: string; set: (value: number, attributes?: MetricAttributes) => void };
export type Metrics = {
    counter: (name: string, options?: { description?: string }) => CounterHandle;
    histogram: (name: string, options?: { description?: string; bucketBoundaries?: number[] }) => HistogramHandle;
    gauge: (name: string, options?: { description?: string }) => GaugeHandle;
};
export function createMetrics(props?: {
    currentMeterProviderOf?: () => any;
    meterName?: string;
    logger?: { error: (...args: any[]) => void };
}): Metrics;
export const NoOpMetrics: Metrics;
export const MetricsContract: Metrics;
export default MetricsContract;
