import { Text } from "@chakra-ui/layout";
import React, { useEffect, useState } from "react";

function Welcome(): JSX.Element {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/hello")
      .then((response) => response.json())
      .then((data) => setMessage(data.message));
  }, []);

  return <Text fontWeight="bold">{message}</Text>;
}

export default Welcome;
