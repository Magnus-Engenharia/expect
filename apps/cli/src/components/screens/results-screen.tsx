import { useState } from "react";
import * as path from "node:path";
import * as url from "node:url";
import { Box, Text, useInput } from "ink";
import Link from "ink-link";
import { postPullRequestComment, type BrowserRunReport } from "@browser-tester/supervisor";
import { useFlowSessionStore } from "../../stores/use-flow-session";
import { copyToClipboard } from "../../utils/copy-to-clipboard";
import { openUrl } from "../../utils/open-url";
import { useColors } from "../theme-context";
import { RuledBox } from "../ui/ruled-box";
import { ScreenHeading } from "../ui/screen-heading";
import { FileLink } from "../ui/file-link";
import { Image } from "../ui/image";
import { ErrorMessage } from "../ui/error-message";
import { Clickable } from "../ui/clickable";

const isRemoteUrl = (value: string | undefined): boolean =>
  typeof value === "string" && (value.startsWith("https://") || value.startsWith("http://"));

const isFileUrl = (value: string | undefined): boolean =>
  typeof value === "string" && value.startsWith("file://");

const buildResultsClipboardText = (report: BrowserRunReport): string => {
  const screenshotPaths = report.artifacts.screenshotPaths;
  const clipboardLines = [
    `Title: ${report.title}`,
    `Status: ${report.status}`,
    `Summary: ${report.summary}`,
  ];

  if (report.pullRequest) {
    clipboardLines.push(`Open PR: #${report.pullRequest.number} ${report.pullRequest.url}`);
  }

  if (report.artifacts.highlightVideoPath) {
    clipboardLines.push(`Highlight reel: ${report.artifacts.highlightVideoPath}`);
  }

  if (report.artifacts.rawVideoPath) {
    clipboardLines.push(`Raw video: ${report.artifacts.rawVideoPath}`);
  }

  if (report.artifacts.shareSummaryPath) {
    clipboardLines.push(`Share summary: ${report.artifacts.shareSummaryPath}`);
  }

  if (report.artifacts.shareBundlePath) {
    clipboardLines.push(`Share bundle: ${report.artifacts.shareBundlePath}`);
  }

  if (report.artifacts.shareUrl) {
    clipboardLines.push(
      `${isRemoteUrl(report.artifacts.shareUrl) ? "Share URL" : "Local report"}: ${report.artifacts.shareUrl}`,
    );
  }

  screenshotPaths.forEach((screenshotPath, index) => {
    clipboardLines.push(`Screenshot ${index + 1}: ${screenshotPath}`);
  });

  return clipboardLines.join("\n");
};

export const ResultsScreen = () => {
  const COLORS = useColors();
  const latestRunReport = useFlowSessionStore((state) => state.latestRunReport);
  const resolvedTarget = useFlowSessionStore((state) => state.resolvedTarget);
  const flowSaveStatus = useFlowSessionStore((state) => state.flowSaveStatus);
  const savedFlowPath = useFlowSessionStore((state) => state.savedFlowPath);
  const flowSaveError = useFlowSessionStore((state) => state.flowSaveError);
  const saveCurrentFlow = useFlowSessionStore((state) => state.saveCurrentFlow);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [clipboardStatusMessage, setClipboardStatusMessage] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [commentStatusMessage, setCommentStatusMessage] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const handleCopyToClipboard = () => {
    if (!latestRunReport) {
      return;
    }

    setClipboardError(null);
    setClipboardStatusMessage(null);

    const didCopy = copyToClipboard(buildResultsClipboardText(latestRunReport));
    if (didCopy) {
      setClipboardStatusMessage("Copied share details to the clipboard.");
      return;
    }

    setClipboardError("Failed to copy share details to the clipboard.");
  };

  const handlePostPullRequestComment = () => {
    if (!latestRunReport || !latestRunReport.pullRequest || !resolvedTarget || isPostingComment) {
      return;
    }

    setIsPostingComment(true);
    setCommentError(null);
    setCommentStatusMessage(null);

    void Promise.resolve()
      .then(() =>
        postPullRequestComment({
          cwd: resolvedTarget.cwd,
          report: latestRunReport,
        }),
      )
      .then((result) => {
        setCommentStatusMessage(
          `Posted a comment on PR #${result.pullRequest.number} (${result.pullRequest.title}).`,
        );
      })
      .catch((caughtError) => {
        setCommentError(
          caughtError instanceof Error ? caughtError.message : "Failed to post PR comment.",
        );
      })
      .finally(() => {
        setIsPostingComment(false);
      });
  };

  const openLocalFile = (filePath: string) => {
    openUrl(isFileUrl(filePath) ? filePath : url.pathToFileURL(path.resolve(filePath)).href);
  };

  const handleSaveFlow = () => {
    if (flowSaveStatus === "generating") {
      return;
    }

    void saveCurrentFlow();
  };

  useInput((input) => {
    const normalizedInput = input.toLowerCase();

    if (normalizedInput === "y") {
      handleCopyToClipboard();
      return;
    }

    if (normalizedInput === "p") {
      handlePostPullRequestComment();
      return;
    }

    if (normalizedInput === "s") {
      handleSaveFlow();
      return;
    }

    if (normalizedInput === "v" && latestRunReport) {
      const videoPath = latestRunReport.artifacts.rawVideoPath;
      if (videoPath) openLocalFile(videoPath);
      return;
    }

    if (normalizedInput === "h" && latestRunReport?.artifacts.highlightVideoPath) {
      openLocalFile(latestRunReport.artifacts.highlightVideoPath);
      return;
    }

    if (normalizedInput === "o" && latestRunReport?.artifacts.shareUrl) {
      const shareUrl = latestRunReport.artifacts.shareUrl;
      if (isRemoteUrl(shareUrl) || isFileUrl(shareUrl)) {
        openUrl(shareUrl);
      } else {
        openLocalFile(shareUrl);
      }
    }
  });

  if (!latestRunReport) return null;

  const screenshotPaths = latestRunReport.artifacts.screenshotPaths;
  const shareUrl = latestRunReport.artifacts.shareUrl;

  return (
    <Box flexDirection="column" width="100%" paddingY={1}>
      <Box paddingX={1}>
        <ScreenHeading
          title="Run results"
          subtitle={`${latestRunReport.title} │ ${latestRunReport.status.toUpperCase()}`}
        />
      </Box>

      <RuledBox
        color={latestRunReport.status === "passed" ? COLORS.GREEN : COLORS.RED}
        marginTop={1}
      >
        <Text color={latestRunReport.status === "passed" ? COLORS.GREEN : COLORS.RED} bold>
          {latestRunReport.status === "passed" ? "Test completed" : "Issues found"}
        </Text>
        <Text color={COLORS.TEXT}>{latestRunReport.summary}</Text>
        {latestRunReport.pullRequest ? (
          <Text color={COLORS.DIM}>
            Open PR:{" "}
            <Link url={latestRunReport.pullRequest.url}>
              <Text>{`#${latestRunReport.pullRequest.number} ${latestRunReport.pullRequest.title}`}</Text>
            </Link>
          </Text>
        ) : null}
      </RuledBox>

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Text color={COLORS.DIM} bold>
          FINDINGS
        </Text>
        {latestRunReport.findings.length > 0 ? (
          latestRunReport.findings.map((finding) => (
            <Text
              key={finding.id}
              color={finding.severity === "error" ? COLORS.RED : COLORS.YELLOW}
            >
              • {finding.title}: <Text color={COLORS.TEXT}>{finding.detail}</Text>
            </Text>
          ))
        ) : (
          <Text color={COLORS.GREEN}>No blocking findings detected.</Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Text color={COLORS.DIM} bold>
          STEP SUMMARY
        </Text>
        {latestRunReport.stepResults.map((stepResult) => (
          <Text
            key={stepResult.stepId}
            color={
              stepResult.status === "passed"
                ? COLORS.GREEN
                : stepResult.status === "failed"
                  ? COLORS.RED
                  : COLORS.YELLOW
            }
          >
            • {stepResult.title}: <Text color={COLORS.TEXT}>{stepResult.summary}</Text>
          </Text>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Text color={COLORS.DIM} bold>
          ARTIFACTS
        </Text>
        {latestRunReport.artifacts.highlightVideoPath ? (
          <Text color={COLORS.DIM}>
            Highlight reel: <FileLink path={latestRunReport.artifacts.highlightVideoPath} />
          </Text>
        ) : null}
        {latestRunReport.artifacts.rawVideoPath ? (
          <Text color={COLORS.DIM}>
            Raw video: <FileLink path={latestRunReport.artifacts.rawVideoPath} />
          </Text>
        ) : null}
        {shareUrl ? (
          isRemoteUrl(shareUrl) ? (
            <Text color={COLORS.DIM}>
              Share URL:{" "}
              <Link url={shareUrl}>
                <Text>{shareUrl}</Text>
              </Link>
            </Text>
          ) : (
            <Text color={COLORS.DIM}>
              Local report: <FileLink path={shareUrl} />
            </Text>
          )
        ) : null}
      </Box>

      {latestRunReport.warnings.length > 0 ? (
        <RuledBox color={COLORS.YELLOW} marginTop={1}>
          <Text color={COLORS.YELLOW} bold>
            ARTIFACT WARNINGS
          </Text>
          {latestRunReport.warnings.map((warning) => (
            <Text key={warning} color={COLORS.DIM}>
              • {warning}
            </Text>
          ))}
        </RuledBox>
      ) : null}

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Clickable onClick={handleSaveFlow}>
          <Text color={COLORS.DIM}>
            Press <Text color={COLORS.PRIMARY}>s</Text> to save this run as a reusable flow.
          </Text>
        </Clickable>
        {flowSaveStatus === "generating" ? (
          <Text color={COLORS.DIM}>Generating saved flow...</Text>
        ) : null}
        {flowSaveStatus === "saved" && savedFlowPath ? (
          <Text color={COLORS.GREEN}>
            Saved flow: <FileLink path={savedFlowPath} />
          </Text>
        ) : null}
      </Box>

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        <Clickable onClick={handleCopyToClipboard}>
          <Text color={COLORS.DIM}>
            Press <Text color={COLORS.PRIMARY}>y</Text> to copy share details to the clipboard.
          </Text>
        </Clickable>
        {clipboardStatusMessage ? <Text color={COLORS.GREEN}>{clipboardStatusMessage}</Text> : null}
      </Box>

      {latestRunReport.pullRequest ? (
        <Box flexDirection="column" paddingX={1}>
          <Clickable onClick={handlePostPullRequestComment}>
            <Text color={COLORS.DIM}>
              Press <Text color={COLORS.PRIMARY}>p</Text> to post this summary to the PR.
            </Text>
          </Clickable>
          {isPostingComment ? <Text color={COLORS.DIM}>Posting PR comment...</Text> : null}
          {commentStatusMessage ? <Text color={COLORS.GREEN}>{commentStatusMessage}</Text> : null}
        </Box>
      ) : null}

      <Box paddingX={1} flexDirection="column">
        <ErrorMessage message={clipboardError} />
        <ErrorMessage message={commentError} />
        <ErrorMessage message={flowSaveStatus === "error" ? flowSaveError : null} />
      </Box>

      {screenshotPaths.map((screenshotPath) => (
        <Box key={screenshotPath} paddingX={1}>
          <Image src={screenshotPath} alt={`Screenshot: ${screenshotPath}`} />
        </Box>
      ))}
    </Box>
  );
};
