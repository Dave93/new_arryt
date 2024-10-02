import { useGetIdentity } from "@refinedev/core";

// It is recommended to use explicit import as seen below to reduce bundle size.
// import { IconName } from "@ant-design/icons";

import { Layout as AntdLayout, Space, Avatar, Typography } from "antd";

import { useState } from "react";
// It is recommended to use explicit import as seen below to reduce bundle size.
// import { IconName } from "@ant-design/icons";

const { Text } = Typography;

let LangStrings = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
};

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity({
    v3LegacyAuthProviderCompatible: true,
  });
  const [qrModalOpen, setQrModalOpen] = useState(false);

  return (
    <AntdLayout.Header
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0px 24px",
        height: "64px",
        backgroundColor: "#FFF",
      }}
    >
      {/* <Dropdown menu={menu}>
        <Button type="link">
          <Space>
            <Avatar size={16} src={`/images/flags/${currentLocale}.svg`} />
            {LangStrings[currentLocale as keyof typeof LangStrings]}
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown> */}
      <Space style={{ marginLeft: "8px" }}>
        {user?.name && (
          <Text ellipsis strong>
            {user.name}
          </Text>
        )}
        {user?.avatar && <Avatar src={user?.avatar} alt={user?.name} />}
      </Space>
    </AntdLayout.Header>
  );
};
