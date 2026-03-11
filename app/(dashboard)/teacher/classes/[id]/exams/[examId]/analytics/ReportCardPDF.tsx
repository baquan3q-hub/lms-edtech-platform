"use client";

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register font for Vietnamese support (Roboto)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4f46e5',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    color: '#312e81',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  label: {
    width: 150,
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
  },
  scoreBox: {
    backgroundColor: '#eff6ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  scoreTitle: {
    fontSize: 14,
    color: '#1d4ed8',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  boxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
    marginTop: 15,
  },
  listItem: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
    marginLeft: 10,
  },
  aiBox: {
    backgroundColor: '#f5f3ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5b21b6',
    marginBottom: 8,
  },
  aiText: {
    fontSize: 12,
    color: '#4c1d95',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  }
});

interface ReportCardProps {
  studentName: string;
  examTitle: string;
  score: number;
  totalPoints: number;
  timeTaken: string;
  strengths: any[];
  weaknesses: any[];
  aiInsight: string | null;
  dateStr: string;
}

const ReportCardPDF = ({ 
  studentName, examTitle, score, totalPoints, timeTaken, strengths, weaknesses, aiInsight, dateStr
}: ReportCardProps) => {
  const percent = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
  let status = "Cần cố gắng";
  if (percent >= 80) status = "Giỏi";
  else if (percent >= 65) status = "Khá";
  else if (percent >= 50) status = "Đạt";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>BÁO CÁO KẾT QUẢ HỌC TẬP</Text>
          <Text style={styles.subtitle}>Hệ thống Đào tạo Trực tuyến LMS E-Learning</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Họ và tên học viên:</Text>
            <Text style={styles.value}>{studentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tên Bài kiểm tra:</Text>
            <Text style={styles.value}>{examTitle}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ngày nộp bài:</Text>
            <Text style={styles.value}>{dateStr}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Thời gian làm bài:</Text>
            <Text style={styles.value}>{timeTaken}</Text>
          </View>
        </View>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreTitle}>Điểm số / Đánh giá</Text>
          <Text style={styles.scoreValue}>{score} / {totalPoints}</Text>
          <Text style={{ fontSize: 14, color: '#2563eb', marginTop: 5 }}>Xếp loại: {status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.boxTitle}>Biểu đồ Năng lực (Kỹ năng mạnh):</Text>
          {strengths && strengths.length > 0 ? strengths.map((s, i) => (
            <Text key={i} style={styles.listItem}>
              • {s.type === 'tag' ? `Kỹ năng: ${s.name}` : s.name} - Đạt {s.percent}%
            </Text>
          )) : <Text style={styles.listItem}>Không có dữ liệu nổi bật.</Text>}

          <Text style={[styles.boxTitle, { marginTop: 20 }]}>Điểm cần cải thiện (Cần ôn tập):</Text>
          {weaknesses && weaknesses.length > 0 ? weaknesses.map((w, i) => (
            <Text key={i} style={styles.listItem}>
              • {w.type === 'tag' ? `Kỹ năng: ${w.name}` : w.name} - Đạt {w.percent}%
            </Text>
          )) : <Text style={styles.listItem}>Làm khá đều các phần.</Text>}
        </View>

        {aiInsight && (
          <View style={styles.aiBox}>
            <Text style={styles.aiTitle}>Nhận xét từ Gia Sư AI:</Text>
            <Text style={styles.aiText}>{aiInsight.replace(/\*\*/g, '').replace(/\*/g, '')}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Chữ ký Xác nhận của Giáo viên / Hệ thống</Text>
          <Text style={{ marginTop: 5, color: '#cbd5e1' }}>Generated automatically by LMS Platform</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportCardPDF;
