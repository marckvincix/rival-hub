import React from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TermsModal({ visible, onClose }: TermsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Termini e Privacy</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>TERMINI DI SERVIZIO E PRIVACY POLICY</Text>
          
          <Text style={styles.subtitle}>1. Informazioni generali</Text>
          <Text style={styles.text}>
            Rival Hub è una piattaforma digitale gratuita per la gestione di tornei sportivi, fornita da Omniaweb srls.
          </Text>
          <Text style={styles.text}>
            L'utilizzo della piattaforma implica l'accettazione dei presenti Termini di Servizio e della Privacy Policy.
          </Text>
          
          <Text style={styles.subtitle}>2. Registrazione e accesso</Text>
          <Text style={styles.text}>L'utente può accedere alla piattaforma tramite:</Text>
          <Text style={styles.listItem}>• registrazione con email e password</Text>
          <Text style={styles.listItem}>• autenticazione tramite account di terze parti (es. Google)</Text>
          <Text style={styles.text}>
            L'utente è responsabile della sicurezza delle proprie credenziali di accesso.
          </Text>
          
          <Text style={styles.subtitle}>3. Accesso tramite servizi di terze parti</Text>
          <Text style={styles.text}>
            La piattaforma consente l'accesso tramite account Google.
          </Text>
          <Text style={styles.text}>
            Utilizzando questa modalità, l'utente autorizza Rival Hub a ricevere alcuni dati dal provider, tra cui:
          </Text>
          <Text style={styles.listItem}>• nome</Text>
          <Text style={styles.listItem}>• cognome</Text>
          <Text style={styles.listItem}>• indirizzo email</Text>
          <Text style={styles.listItem}>• immagine profilo (se disponibile)</Text>
          <Text style={styles.text}>
            Tali dati sono utilizzati esclusivamente per autenticazione e gestione dell'account. La piattaforma non ha accesso alla password dell'utente.
          </Text>
          <Text style={styles.text}>
            L'utilizzo di servizi di terze parti è soggetto anche ai termini e alle policy del provider.
          </Text>
          
          <Text style={styles.subtitle}>4. Responsabilità dell'utente (contenuti e dati di terzi)</Text>
          <Text style={styles.text}>
            L'utente è l'unico responsabile dei dati inseriti nell'app, inclusi:
          </Text>
          <Text style={styles.listItem}>• dati personali</Text>
          <Text style={styles.listItem}>• immagini e contenuti multimediali</Text>
          <Text style={styles.listItem}>• dati relativi a terzi (giocatori, squadre, collaboratori)</Text>
          <Text style={styles.text}>
            L'utente garantisce di aver ottenuto il consenso informato di tutti i soggetti coinvolti.
          </Text>
          <Text style={styles.text}>
            Per i minori, è obbligatorio il consenso verificabile di genitori o tutori legali.
          </Text>
          <Text style={styles.text}>
            Omniaweb srls non è responsabile per l'inserimento illecito di dati da parte degli utenti.
          </Text>
          
          <Text style={styles.subtitle}>5. Contenuti multimediali</Text>
          <Text style={styles.text}>
            L'utente garantisce di avere i diritti o le autorizzazioni necessarie per foto e video caricati.
          </Text>
          <Text style={styles.text}>
            Caricando contenuti, l'utente manleva Rival Hub da qualsiasi responsabilità relativa a:
          </Text>
          <Text style={styles.listItem}>• violazione della privacy</Text>
          <Text style={styles.listItem}>• diritti d'immagine</Text>
          
          <Text style={styles.subtitle}>6. Divieti e sospensione</Text>
          <Text style={styles.text}>È vietato:</Text>
          <Text style={styles.listItem}>• utilizzare la piattaforma per scopi illeciti</Text>
          <Text style={styles.listItem}>• violare diritti di terzi</Text>
          <Text style={styles.listItem}>• caricare contenuti senza autorizzazione</Text>
          <Text style={styles.text}>
            Il titolare può sospendere o eliminare account senza preavviso.
          </Text>
          
          <Text style={styles.subtitle}>7. Limitazione di responsabilità</Text>
          <Text style={styles.text}>Il servizio è fornito "così com'è".</Text>
          <Text style={styles.text}>Non è garantita:</Text>
          <Text style={styles.listItem}>• disponibilità continua</Text>
          <Text style={styles.listItem}>• assenza di errori o perdita dati</Text>
          
          <Text style={styles.subtitle}>8. Conservazione dei contenuti</Text>
          <Text style={styles.listItem}>• Highlights: eliminati dopo 365 giorni</Text>
          <Text style={styles.listItem}>• Dati account e contenuti: fino a cancellazione da parte dell'utente</Text>
          
          <Text style={styles.subtitle}>9. Legge applicabile</Text>
          <Text style={styles.text}>Legge italiana.</Text>
          <Text style={styles.text}>Foro competente: Napoli.</Text>
          
          <Text style={styles.sectionTitle}>PRIVACY POLICY</Text>
          <Text style={styles.sectionSubtitle}>(ai sensi del Regolamento generale sulla protezione dei dati)</Text>
          
          <Text style={styles.subtitle}>10. Titolare del trattamento</Text>
          <Text style={styles.text}>Omniaweb srls</Text>
          <Text style={styles.text}>Email: info@rivalhub.app</Text>
          
          <Text style={styles.subtitle}>11. Dati raccolti</Text>
          <Text style={styles.text}>La piattaforma raccoglie:</Text>
          <Text style={styles.listItem}>• dati account (email, nome, cognome)</Text>
          <Text style={styles.listItem}>• dati forniti tramite login Google</Text>
          <Text style={styles.listItem}>• dati inseriti dall'utente relativi a terzi</Text>
          <Text style={styles.listItem}>• contenuti multimediali</Text>
          
          <Text style={styles.subtitle}>12. Finalità del trattamento</Text>
          <Text style={styles.text}>I dati sono trattati per:</Text>
          <Text style={styles.listItem}>• creazione e gestione account</Text>
          <Text style={styles.listItem}>• utilizzo della piattaforma</Text>
          <Text style={styles.listItem}>• gestione tornei</Text>
          <Text style={styles.listItem}>• sicurezza e prevenzione abusi</Text>
          
          <Text style={styles.subtitle}>13. Base giuridica</Text>
          <Text style={styles.text}>Il trattamento si basa su:</Text>
          <Text style={styles.listItem}>• esecuzione del servizio</Text>
          <Text style={styles.listItem}>• consenso dell'utente</Text>
          <Text style={styles.listItem}>• legittimo interesse del titolare</Text>
          
          <Text style={styles.subtitle}>14. Modalità del trattamento</Text>
          <Text style={styles.text}>
            I dati sono trattati con strumenti informatici e misure di sicurezza adeguate per garantirne protezione e riservatezza, come richiesto dal GDPR.
          </Text>
          
          <Text style={styles.subtitle}>15. Conservazione dei dati</Text>
          <Text style={styles.listItem}>• dati account: fino alla cancellazione</Text>
          <Text style={styles.listItem}>• dati inseriti: fino a eliminazione</Text>
          <Text style={styles.listItem}>• log tecnici: fino a 12 mesi</Text>
          
          <Text style={styles.subtitle}>16. Dati di minori</Text>
          <Text style={styles.text}>
            L'utente è responsabile dell'inserimento dei dati di minori e garantisce il consenso dei genitori o tutori.
          </Text>
          
          <Text style={styles.subtitle}>17. Responsabili del trattamento</Text>
          <Text style={styles.text}>
            Il titolare utilizza fornitori tecnici (hosting, cloud, email), nominati responsabili del trattamento.
          </Text>
          
          <Text style={styles.subtitle}>18. Trasferimento dati</Text>
          <Text style={styles.text}>
            I dati possono essere trattati anche fuori dallo Spazio Economico Europeo, nel rispetto delle garanzie previste dal GDPR.
          </Text>
          
          <Text style={styles.subtitle}>19. Diritti dell'utente</Text>
          <Text style={styles.text}>L'utente può esercitare:</Text>
          <Text style={styles.listItem}>• accesso</Text>
          <Text style={styles.listItem}>• rettifica</Text>
          <Text style={styles.listItem}>• cancellazione</Text>
          <Text style={styles.listItem}>• limitazione</Text>
          <Text style={styles.listItem}>• opposizione</Text>
          <Text style={styles.listItem}>• portabilità</Text>
          <Text style={styles.text}>
            Può inoltre presentare reclamo al Garante per la Protezione dei Dati Personali.
          </Text>
          
          <Text style={styles.subtitle}>20. Revoca del consenso</Text>
          <Text style={styles.text}>
            L'utente può revocare il consenso in qualsiasi momento senza pregiudicare la liceità del trattamento precedente.
          </Text>
          
          <Text style={styles.subtitle}>21. Data breach</Text>
          <Text style={styles.text}>
            In caso di violazione dei dati, il titolare agirà secondo quanto previsto dal GDPR.
          </Text>
          
          <Text style={styles.subtitle}>22. Cookie</Text>
          <Text style={styles.text}>
            La piattaforma utilizza esclusivamente cookie tecnici necessari.
          </Text>
          <Text style={styles.text}>
            Non vengono utilizzati cookie di profilazione o marketing.
          </Text>
          
          <Text style={styles.subtitle}>23. Modifiche</Text>
          <Text style={styles.text}>
            Il titolare può modificare i presenti Termini e la Privacy Policy.
          </Text>
          <Text style={styles.text}>
            Le modifiche saranno comunicate tramite la piattaforma.
          </Text>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginLeft: 16,
    marginBottom: 4,
  },
});
