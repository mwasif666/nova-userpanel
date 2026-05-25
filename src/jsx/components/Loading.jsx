import { Spin } from "antd";

const Loading = () => {
  return (
    <div id="preloader" role="status" aria-label="Loading">
      <Spin size="large" />
    </div>
  );
};

export default Loading;
