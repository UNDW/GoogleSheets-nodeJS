import React, { useReducer, useState } from "react";
import { Input, Container, Button, Row, Col } from "@nextui-org/react";
import styles from "../styles/Home.module.css";

const formReducer = (state, event) => {
  return {
    ...state,
    [event.name]: event.value,
  };
};

export default function Home() {
  const [formData, setFormData] = useReducer(formReducer, {});
  const [data, setData] = useState([]);

  const handleChange = (event) => {
    setFormData({
      name: event.target.name,
      value: event.target.value,
    });
  };

  async function postForm(data) {
    const response = await fetch("/api/form", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  }

  const handleSubmit = (event) => {
    postForm(formData).then((a) => {
      setData(a);
    });
  };

  return (
    <div className={styles.container}>
      <Container>
        <Row>
          <Col>
            <Input
              name="manager"
              label="Manager Name"
              onChange={handleChange}
            />
            <Input
              name="dateStart"
              label="startDate"
              type="date"
              onChange={handleChange}
            />
            <Input
              name="dateEnd"
              label="endDate"
              type="date"
              onChange={handleChange}
            />
          </Col>
          <Row>
            <Col>
              <Button onPress={handleSubmit}>Show</Button>
            </Col>
          </Row>
        </Row>
        <Row>{data}</Row>
      </Container>
    </div>
  );
}