import { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Button, TextInput, Text, IconButton, Menu, HelperText, Divider, Portal, Dialog } from "react-native-paper";
import { useApp } from "../../../context/AppContext";
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export default function AddGroupMemberScreen({ navigation, route }: any) {
  const { state } = useApp();
  const token = state.token;

  // Member information - EXACT fields required
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [govId, setGovId] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  
  const [genderMenuVisible, setGenderMenuVisible] = useState(false);
  const [bloodGroupMenuVisible, setBloodGroupMenuVisible] = useState(false);

  const [msg, setMsg] = useState<{
    type: "error" | "success" | "info";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchImportDialogVisible, setBatchImportDialogVisible] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const genderOptions = ["Male", "Female", "Other"];
  const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  // Pick CSV file from device storage
  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      
      // Read file content using new File API
      if (asset.uri) {
        const file = new File(asset.uri);
        const content = await file.text();
        setCsvData(content);
        Alert.alert("Success", `File "${asset.name}" loaded successfully!\n${content.split('\n').length - 1} rows found.`);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to pick or read CSV file");
    }
  };

  // Generate CSV template
  const downloadTemplate = () => {
    const template = `FullName,DateOfBirth,Nationality,Gender,Email,PhoneNumber,GovID,EmergencyName,EmergencyContact,BloodGroup
John Doe,1995-05-15,Indian,Male,john@example.com,+911234567890,AAAA-1111-BBBB,Jane Doe,+919876543210,A+
Jane Smith,1992-08-22,American,Female,jane@example.com,+919876543210,BBBB-2222-CCCC,John Smith,+911234567890,B+`;
    
    Alert.alert(
      "CSV Template",
      "Copy this template and fill it with your members' data:\n\n" + template,
      [
        {
          text: "Copy Template",
          onPress: () => {
            Alert.alert("Template", "Template format:\nFullName,DateOfBirth,Nationality,Gender,Email,PhoneNumber,GovID,EmergencyName,EmergencyContact,BloodGroup");
          },
        },
        { text: "OK" },
      ]
    );
  };

  // Parse CSV data
  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const members: any[] = [];

    // Validate exact headers
    const requiredHeaders = ['fullname', 'dateofbirth', 'nationality', 'gender', 'email', 'phonenumber', 'govid', 'emergencyname', 'emergencycontact', 'bloodgroup'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has incorrect number of columns`);
      }

      const member: any = {};
      headers.forEach((header, index) => {
        member[header] = values[index];
      });

      // Validate required fields
      if (!member.fullname || !member.dateofbirth || !member.nationality || !member.gender || 
          !member.email || !member.phonenumber || !member.govid || 
          !member.emergencyname || !member.emergencycontact || !member.bloodgroup) {
        throw new Error(`Row ${i + 1} is missing required fields`);
      }

      members.push({
        fullName: member.fullname,
        dateOfBirth: member.dateofbirth,
        nationality: member.nationality,
        gender: member.gender,
        email: member.email,
        phoneNumber: member.phonenumber,
        govId: member.govid,
        emergencyName: member.emergencyname,
        emergencyContact: member.emergencycontact,
        bloodGroup: member.bloodgroup,
      });
    }

    return members;
  };

  // Batch import members from CSV
  const onBatchImport = async () => {
    if (!csvData.trim()) {
      Alert.alert("Error", "Please paste your CSV data");
      return;
    }

    setImportLoading(true);
    try {
      const members = parseCSV(csvData);
      const { register } = await import("../../../utils/api");
      
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const member of members) {
        try {
          const memberData = {
            role: "group-member" as const,
            name: member.fullName,
            email: member.email,
            dateOfBirth: member.dateOfBirth,
            nationality: member.nationality,
            gender: member.gender,
            govId: member.govId,
            phone: member.phoneNumber,
            bloodGroup: member.bloodGroup,
            dayWiseItinerary: [],
            emergencyContact: { 
              name: member.emergencyName, 
              phone: member.emergencyContact 
            },
            language: state.language,
            tripEndDate: undefined,
          };

          const res = await register(memberData);
          
          if (res && res.audit && res.audit.regTxHash) {
            successCount++;
            console.log(`✓ ${member.fullName} added successfully`);
          } else {
            failCount++;
            errors.push(`${member.fullName}: Registration failed`);
          }
        } catch (error: any) {
          failCount++;
          errors.push(`${member.fullName}: ${error.message}`);
        }
      }

      setBatchImportDialogVisible(false);
      setCsvData("");
      
      if (successCount > 0) {
        Alert.alert(
          "Batch Import Complete",
          `✓ ${successCount} member(s) added successfully\n` +
          (failCount > 0 ? `✗ ${failCount} failed\n\nErrors:\n${errors.join('\n')}` : ''),
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Import Failed", `All imports failed:\n${errors.join('\n')}`);
      }
    } catch (error: any) {
      Alert.alert("Parse Error", error.message || "Failed to parse CSV data");
    } finally {
      setImportLoading(false);
    }
  };

  const onAddMember = async () => {
    // Basic validation - ALL fields required
    if (!fullName || !dateOfBirth || !nationality || !gender || !email || 
        !phoneNumber || !govId || !emergencyName || !emergencyContact || 
        !bloodGroup) {
      setMsg({ type: "error", text: "Please fill in all fields" });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const { register } = await import("../../../utils/api");
      
      const memberData = {
        role: "group-member" as const,
        name: fullName,
        email: email,
        dateOfBirth: dateOfBirth,
        nationality: nationality,
        gender: gender,
        govId: govId,
        phone: phoneNumber,
        bloodGroup: bloodGroup,
        dayWiseItinerary: [],
        emergencyContact: { 
          name: emergencyName, 
          phone: emergencyContact 
        },
        language: state.language,
        tripEndDate: undefined,
      };

      const res = await register(memberData);

      if (!res || !res.audit || !res.audit.regTxHash) {
        setMsg({ type: "error", text: "Failed to add member. Please try again." });
        setLoading(false);
        return;
      }

      setMsg({ type: "success", text: `Member ${fullName} added successfully!` });
      
      // Clear form after successful addition
      setTimeout(() => {
        setFullName("");
        setDateOfBirth("");
        setNationality("");
        setGender("");
        setEmail("");
        setPhoneNumber("");
        setGovId("");
        setEmergencyName("");
        setEmergencyContact("");
        setBloodGroup("");
        setMsg(null);
      }, 2000);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "An error occurred" });
    }
    setLoading(false);
  };

  const onSkip = () => {
    navigation.replace("Main");
  };

  const onDone = () => {
    navigation.replace("Main");
  };

  return (
    <View style={styles.screenContainer}>
      <IconButton
        icon="arrow-left"
        size={24}
        onPress={() => navigation.goBack()}
        style={styles.backIcon}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Add Group Members</Text>
            <Text style={styles.subtitle}>Add members individually or import from CSV</Text>
          </View>

          {/* Batch Import Section */}
          <View style={styles.batchImportSection}>
            <Button
              mode="outlined"
              onPress={() => setBatchImportDialogVisible(true)}
              style={styles.batchImportButton}
              contentStyle={styles.batchImportButtonContent}
              labelStyle={styles.batchImportButtonLabel}
              icon="file-upload-outline"
            >
              Batch Import from CSV
            </Button>
            <Button
              mode="text"
              onPress={downloadTemplate}
              style={styles.templateButton}
              labelStyle={styles.templateButtonLabel}
              icon="download-outline"
            >
              Download Template
            </Button>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Or Add Member Manually</Text>

          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                mode="flat"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth *</Text>
              <TextInput
                mode="flat"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD (e.g., 1995-05-15)"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {/* Nationality */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nationality *</Text>
              <TextInput
                mode="flat"
                value={nationality}
                onChangeText={setNationality}
                placeholder="Enter nationality (e.g., Indian)"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender *</Text>
              <Menu
                visible={genderMenuVisible}
                onDismiss={() => setGenderMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.genderSelector}
                    onPress={() => setGenderMenuVisible(true)}
                  >
                    <Text style={gender ? styles.genderSelectedText : styles.genderPlaceholder}>
                      {gender || "Select gender"}
                    </Text>
                    <IconButton icon="chevron-down" size={20} style={styles.chevronIcon} />
                  </TouchableOpacity>
                }
                contentStyle={styles.menuContent}
              >
                {genderOptions.map((option) => (
                  <Menu.Item
                    key={option}
                    onPress={() => {
                      setGender(option);
                      setGenderMenuVisible(false);
                    }}
                    title={option}
                    titleStyle={styles.menuItemTitle}
                  />
                ))}
              </Menu>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                mode="flat"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phoneCodeBox}>
                  <Text style={styles.phoneCodeText}>+91</Text>
                </View>
                <TextInput
                  mode="flat"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  placeholderTextColor="#9CA4AB"
                />
              </View>
            </View>

            {/* Gov ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gov ID *</Text>
              <TextInput
                mode="flat"
                value={govId}
                onChangeText={setGovId}
                placeholder="Aadhaar/Passport"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
              />
            </View>

            {/* Emergency Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency Contact Name *</Text>
              <TextInput
                mode="flat"
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Emergency contact name"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
                left={<TextInput.Icon icon="account-alert-outline" color="#9CA3AF" />}
              />
            </View>

            {/* Emergency Contact */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency Contact Number *</Text>
              <TextInput
                mode="flat"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                placeholder="Emergency contact number"
                keyboardType="phone-pad"
                style={styles.textInput}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                placeholderTextColor="#9CA4AB"
                left={<TextInput.Icon icon="phone-alert-outline" color="#9CA3AF" />}
              />
            </View>

            {/* Blood Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Blood Group *</Text>
              <Menu
                visible={bloodGroupMenuVisible}
                onDismiss={() => setBloodGroupMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.genderSelector}
                    onPress={() => setBloodGroupMenuVisible(true)}
                  >
                    <Text style={bloodGroup ? styles.genderSelectedText : styles.genderPlaceholder}>
                      {bloodGroup || "Select blood group"}
                    </Text>
                    <IconButton icon="chevron-down" size={20} style={styles.chevronIcon} />
                  </TouchableOpacity>
                }
                contentStyle={styles.menuContent}
              >
                {bloodGroupOptions.map((option) => (
                  <Menu.Item
                    key={option}
                    onPress={() => {
                      setBloodGroup(option);
                      setBloodGroupMenuVisible(false);
                    }}
                    title={option}
                    titleStyle={styles.menuItemTitle}
                  />
                ))}
              </Menu>
            </View>

            {msg && (
              <HelperText type={msg.type === "error" ? "error" : "info"} style={styles.helperText}>
                {msg.text}
              </HelperText>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={onAddMember}
                loading={loading}
                disabled={loading}
                style={styles.addButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon="account-plus"
              >
                Add
              </Button>

              <Button
                mode="contained"
                onPress={onDone}
                disabled={loading}
                style={styles.doneButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.doneButtonLabel}
                icon="check-circle"
              >
                Done
              </Button>
            </View>

            <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Skip for now, I'll add members later</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Batch Import Dialog */}
      <Portal>
        <Dialog visible={batchImportDialogVisible} onDismiss={() => setBatchImportDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Batch Import Members</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Select a CSV file from your device to import multiple members at once.
            </Text>
            
            {/* File Picker Button */}
            <Button
              mode="contained"
              onPress={pickCSVFile}
              style={styles.filePickerButton}
              contentStyle={styles.filePickerButtonContent}
              labelStyle={styles.filePickerButtonLabel}
              icon="file-document-outline"
            >
              Select CSV File
            </Button>

            {csvData && (
              <View style={styles.filePreview}>
                <Text style={styles.filePreviewTitle}>✓ File Loaded</Text>
                <Text style={styles.filePreviewText}>
                  {csvData.split('\n').length - 1} members ready to import
                </Text>
              </View>
            )}

            <Text style={styles.dialogHint}>
              Required format: FullName, DateOfBirth, Nationality, Gender, Email, PhoneNumber, GovID, EmergencyName, EmergencyContact, BloodGroup
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setBatchImportDialogVisible(false);
              setCsvData("");
            }}>Cancel</Button>
            <Button 
              onPress={onBatchImport} 
              loading={importLoading} 
              disabled={importLoading || !csvData.trim()}
              mode="contained"
              buttonColor="#0C87DE"
            >
              Import
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backIcon: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 38,
    left: 20,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 34,
    paddingTop: 88,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Jost",
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.5,
    color: "#171725",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Jost",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: "#434E58",
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: "#171725",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    height: 52,
    paddingLeft: 16,
    fontSize: 14,
  },
  genderSelector: {
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    height: 52,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  genderPlaceholder: {
    fontFamily: "Jost",
    fontSize: 14,
    color: "#9CA4AB",
  },
  genderSelectedText: {
    fontFamily: "Jost",
    fontSize: 14,
    color: "#171725",
  },
  chevronIcon: {
    margin: 0,
  },
  menuContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 8,
  },
  menuItemTitle: {
    fontFamily: "Jost",
    fontSize: 14,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneCodeBox: {
    width: 68,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneCodeText: {
    fontFamily: "Jost",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: "#9CA4AB",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    height: 52,
    paddingLeft: 16,
    fontSize: 14,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 24,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  addButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#0C87DE",
    elevation: 3,
    shadowColor: "#0C87DE",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  doneButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#10B981",
    elevation: 3,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  buttonContent: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonLabel: {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.4,
    color: "#FFFFFF",
    textTransform: "none",
  },
  doneButtonLabel: {
    fontFamily: "Plus Jakarta Sans",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.4,
    color: "#FFFFFF",
    textTransform: "none",
  },
  skipLink: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 12,
  },
  skipLinkText: {
    fontFamily: "Jost",
    fontWeight: "500",
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.3,
    color: "#6B7280",
    textDecorationLine: "underline",
  },
  batchImportSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  batchImportButton: {
    borderRadius: 12,
    borderColor: "#0C87DE",
    borderWidth: 2,
    marginBottom: 8,
    width: "100%",
  },
  batchImportButtonContent: {
    paddingVertical: 12,
  },
  batchImportButtonLabel: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 14,
    color: "#0C87DE",
  },
  templateButton: {
    marginTop: 4,
  },
  templateButtonLabel: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 13,
    color: "#6B7280",
  },
  divider: {
    marginVertical: 24,
    backgroundColor: "#E5E7EB",
  },
  sectionTitle: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 24,
    color: "#171725",
    marginBottom: 16,
    textAlign: "center",
  },
  dialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  dialogTitle: {
    fontFamily: "Jost",
    fontWeight: "700",
    fontSize: 20,
    color: "#171725",
  },
  dialogText: {
    fontFamily: "Jost",
    fontSize: 14,
    color: "#434E58",
    marginBottom: 16,
  },
  filePickerButton: {
    borderRadius: 12,
    backgroundColor: "#0C87DE",
    marginBottom: 16,
  },
  filePickerButtonContent: {
    paddingVertical: 12,
  },
  filePickerButtonLabel: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 15,
    color: "#FFFFFF",
  },
  dialogDivider: {
    marginVertical: 16,
    backgroundColor: "#E5E7EB",
  },
  filePreview: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  filePreviewTitle: {
    fontFamily: "Jost",
    fontWeight: "600",
    fontSize: 14,
    color: "#059669",
    marginBottom: 4,
  },
  filePreviewText: {
    fontFamily: "Jost",
    fontWeight: "400",
    fontSize: 13,
    color: "#065F46",
  },
  dialogHint: {
    fontFamily: "Jost",
    fontSize: 11,
    color: "#9CA4AB",
    fontStyle: "italic",
    marginTop: 8,
  },
});
