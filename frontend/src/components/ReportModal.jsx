import React, { useState } from 'react';
import { Modal, Form, Select, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportModal = ({ visible, onCancel, onGenerate, loading }) => {
    const [form] = Form.useForm();
    const [reportType, setReportType] = useState('monthly');

    const handleTypeChange = (value) => {
        setReportType(value);
        form.resetFields(['monthYear', 'dateRange']);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();

            const payload = {
                type: values.type,
                track: values.track || 'All',
                status: values.status || 'All'
            };

            if (values.type === 'monthly') {
                payload.month = values.monthYear.month() + 1; // dayjs month is 0-indexed
                payload.year = values.monthYear.year();
            } else if (values.type === 'range') {
                payload.startDate = values.dateRange[0].format('YYYY-MM-DD');
                payload.endDate = values.dateRange[1].format('YYYY-MM-DD');
            }

            onGenerate(payload);
        } catch (error) {
            console.log('Validation Failed:', error);
        }
    };

    return (
        <Modal
            open={visible}
            title="Generate Task Report"
            onCancel={onCancel}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
                    Generate & Download
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ type: 'monthly', track: 'All', status: 'All' }}
            >
                <Form.Item
                    name="type"
                    label="Report Type"
                    rules={[{ required: true, message: 'Please select a report type' }]}
                >
                    <Select onChange={handleTypeChange}>
                        <Option value="monthly">Monthly</Option>
                        <Option value="range">Custom Date Range</Option>
                        <Option value="all">All Data</Option>
                    </Select>
                </Form.Item>

                {reportType === 'monthly' && (
                    <Form.Item
                        name="monthYear"
                        label="Select Month & Year"
                        rules={[{ required: true, message: 'Please select month and year' }]}
                    >
                        <DatePicker picker="month" style={{ width: '100%' }} />
                    </Form.Item>
                )}

                {reportType === 'range' && (
                    <Form.Item
                        name="dateRange"
                        label="Select Date Range"
                        rules={[{ required: true, message: 'Please select a date range' }]}
                    >
                        <RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                )}

                <Form.Item name="track" label="Filter by Track (Optional)">
                    <Select>
                        <Option value="All">All Tracks</Option>
                        <Option value="Java MVC">Java MVC</Option>
                        <Option value="Java MS">Java MS</Option>
                        <Option value="Mobile Citizen">Mobile Citizen</Option>
                        <Option value="Mobile Official">Mobile Official</Option>
                        <Option value="React">React</Option>
                        <Option value="Angular">Angular</Option>
                        <Option value="AIML">AIML</Option>
                        <Option value="QA">QA</Option>
                        <Option value="DB">DB</Option>
                        <Option value="Infra">Infra</Option>
                        <Option value="BA">BA</Option>
                        <Option value="Analytics">Analytics</Option>
                    </Select>
                </Form.Item>

                <Form.Item name="status" label="Filter by Status (Optional)">
                    <Select>
                        <Option value="All">All Statuses</Option>
                        <Option value="Not Started">Not Started</Option>
                        <Option value="In Progress">In Progress</Option>
                        <Option value="On Hold">On Hold</Option>
                        <Option value="Completed">Completed</Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ReportModal;
