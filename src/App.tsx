import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  InfiniteLoader,
  List,
  ListRowRenderer
} from "react-virtualized";
import { List as IMList } from "immutable";
import { joinStrings } from "./utils/strings";
import "./App.scss";

const url = "wss://test-log-viewer-backend.stg.onepunch.agency/view-log-ws";
const totalLogsSize = 1.06e9;

interface LogViewerProps {
  logData: IMList<string>;
  loadMoreRows: () => Promise<void>;
  forwardRef: MutableRefObject<List | null>;
  disabledAutoScroll: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({
  logData,
  loadMoreRows,
  forwardRef,
  disabledAutoScroll
}) => {
  const cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 20
  });

  const rowRenderer: ListRowRenderer = ({ index, style, key, parent }) => {
    return (
      <CellMeasurer
        key={key}
        cache={cache}
        parent={parent}
        columnIndex={0}
        rowIndex={index}
      >
        {({ registerChild }) => (
          <div style={style} className="row" ref={registerChild as any}>
            {logData.get(index)}
          </div>
        )}
      </CellMeasurer>
    );
  };

  const scrollToIndex = disabledAutoScroll ? -1 : logData.size - 1;

  return (
    <AutoSizer>
      {({ width, height }) => (
        <InfiniteLoader
          isRowLoaded={({ index }) => !!logData.get(index)}
          loadMoreRows={loadMoreRows}
          rowCount={logData.size + 1}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              ref={(el) => {
                registerChild(el);
                forwardRef.current = el;
              }}
              height={height}
              onRowsRendered={onRowsRendered}
              rowCount={logData.size}
              rowHeight={cache.rowHeight}
              rowRenderer={rowRenderer}
              width={width}
              overscanRowCount={3}
              scrollToIndex={scrollToIndex}
              scrollToAlignment="end"
            />
          )}
        </InfiniteLoader>
      )}
    </AutoSizer>
  );
};

const App = () => {
  const [logData, setLogData] = useState<IMList<string>>(IMList());
  const [size, setSize] = useState<number>(0);
  const [socket, setSocket] = useState<WebSocket>();
  const [disabledAutoScroll, setDisabledAutoScroll] = useState(false);
  const listRef = useRef<List | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    function onOpen() {
      ws.send("Hello Server!");
      console.log("WebSocket connection established");
    }

    function onMessage(event: MessageEvent) {
      const message = event.data;
      setLogData((prevData) => prevData.concat(message));
      const messageSize = new TextEncoder().encode(message).length;
      setSize((prevData) => prevData + messageSize);
    }

    function onClose() {
      console.log("WebSocket connection closed");
    }

    ws.addEventListener("open", onOpen);
    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose);

    setSocket(ws);

    return () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("close", onClose);
      ws.close();
    };
  }, []);

  const downLoadProgress = Number(((size / totalLogsSize) * 100).toFixed(2));

  useEffect(() => {
    if (downLoadProgress > 0) {
      document.title = `${downLoadProgress}%`;
    }
  }, [downLoadProgress]);

  const loadMoreRows = useCallback(() => {
    return new Promise<void>((resolve) => {
      socket?.send("next");
      if (listRef.current) {
        listRef.current.recomputeRowHeights();
      }
      resolve();
    });
  }, [socket]);

  const handledisableAutoScroll = () => {
    setDisabledAutoScroll(!disabledAutoScroll);
  };

  return (
    <div className="container">
      <div className="logs">
        <LogViewer
          logData={logData}
          loadMoreRows={loadMoreRows}
          forwardRef={listRef}
          disabledAutoScroll={disabledAutoScroll}
        />
        <button
          onClick={handledisableAutoScroll}
          className={joinStrings([
            "auto-scroll-btn",
            !disabledAutoScroll && "auto-scroll-btn--active"
          ])}
        />
      </div>
    </div>
  );
};

export default App;
