import React from "react";
import WordCloud from "react-d3-cloud";
import { useSlowWrappedStats } from "../../hooks/dataHooks";
import { CHART_HEIGHT, SectionHeader, SectionWrapper } from "./Containers";
import Box from "@mui/material/Box";
import { ErrorBoundary } from "../ErrorBoundary";
import { LinearProgress } from "@mui/material";

/* — helpers — */
const FONT_FAMILY = "arbeit";
const PADDING = 5;
const rotate = 0;
const fill = () => "#5871f5";

const makeFontSize =
  (min = 15, max = 80) =>
  (word: { value: number }) => {
    // simple log‑scale
    return ((Math.log2(word.value) - 1) / /* spread */ 10) * (max - min) + min;
  };

export const SimpleWordcloud = () => {
  const { data: wrappedStats, isLoading } = useSlowWrappedStats();
  const topOneHundred = wrappedStats?.topOneHundred ?? [];

  /* transform once */
  const words = React.useMemo(
    () =>
      topOneHundred
        .slice(0, 50) // top‑50
        .map(([text, value]) => ({ text, value })),
    [topOneHundred],
  );

  /* get live width / height of the Box so the cloud resizes responsively */
  const ref = React.useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = React.useState({
    width: 0,
    height: 0,
  });

  React.useLayoutEffect(() => {
    const measure = () => {
      if (ref.current) {
        setSize({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <SectionWrapper sx={{ width: "100%", height: CHART_HEIGHT }}>
      <SectionHeader>Wordcloud</SectionHeader>
      {isLoading && <LinearProgress />}
      <Box ref={ref} sx={{ width: "100%", height: "90%" }}>
        <ErrorBoundary>
          {Boolean(words.length) && width > 0 && height > 0 && (
            <WordCloud
              data={words}
              width={width}
              height={height}
              font={FONT_FAMILY}
              fontSize={makeFontSize()}
              padding={PADDING}
              rotate={rotate}
              fill={fill}
            />
          )}
        </ErrorBoundary>
      </Box>
    </SectionWrapper>
  );
};
